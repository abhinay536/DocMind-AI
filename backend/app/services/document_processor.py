try:
    import pymupdf as fitz
except ImportError:
    import fitz
from PIL import Image
import pytesseract
import io
import os
import json
import warnings
from app.config import settings

warnings.filterwarnings("ignore")

if settings.TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD


class DocumentProcessor:
    def __init__(self, pdf_path: str, images_dir: str = None):
        self.pdf_path = pdf_path
        self.doc = fitz.open(pdf_path)
        self.images_dir = images_dir or settings.IMAGES_DIR

    def extract_text_chunks(self):
        chunks = []
        for page_num in range(len(self.doc)):
            page = self.doc[page_num]
            text = page.get_text("text")
            if not text.strip():
                continue
            paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 25]
            for para in paragraphs:
                chunks.append({
                    "type": "text",
                    "content": para,
                    "page": page_num + 1,
                    "source": f"Page {page_num + 1}"
                })
        return chunks

    def extract_tables(self):
        tables = []
        for page_num in range(len(self.doc)):
            page = self.doc[page_num]
            text_dict = page.get_text("dict")
            blocks = text_dict.get("blocks", []) if isinstance(text_dict, dict) else []
            for block in blocks:
                if isinstance(block, dict) and "lines" in block and isinstance(block["lines"], list) and len(block["lines"]) > 3:
                    table_text = ""
                    for line in block["lines"]:
                        if isinstance(line, dict) and "spans" in line and isinstance(line["spans"], list):
                            for span in line["spans"]:
                                if isinstance(span, dict) and "text" in span:
                                    table_text += str(span["text"]) + " "
                            table_text += "\n"
                    if any(char.isdigit() for char in table_text):
                        tables.append({
                            "type": "table",
                            "content": table_text.strip(),
                            "page": page_num + 1,
                            "source": f"Table on Page {page_num + 1}"
                        })
        return tables

    def extract_images_with_ocr(self):
        os.makedirs(self.images_dir, exist_ok=True)
        image_chunks = []
        for page_num in range(len(self.doc)):
            page = self.doc[page_num]
            images = page.get_images(full=True)
            for img_index, img in enumerate(images):
                xref = img[0]
                base_image = self.doc.extract_image(xref)
                if not isinstance(base_image, dict) or "image" not in base_image:
                    continue
                image_bytes = base_image["image"]
                img_filename = f"page{page_num+1}_img{img_index+1}.png"
                img_path = os.path.join(self.images_dir, img_filename)
                with open(img_path, "wb") as f:
                    f.write(image_bytes)

                ocr_text = ""
                if settings.TESSERACT_CMD:
                    try:
                        pil_img = Image.open(io.BytesIO(image_bytes))
                        ocr_text = pytesseract.image_to_string(pil_img)
                    except Exception:
                        ocr_text = ""

                image_chunks.append({
                    "type": "image",
                    "content": ocr_text.strip(),
                    "page": page_num + 1,
                    "image_path": img_path,
                    "source": f"Image on Page {page_num + 1}"
                })
        return image_chunks

    def process_document(self):
        text_chunks = self.extract_text_chunks()
        table_chunks = self.extract_tables()
        image_chunks = self.extract_images_with_ocr()
        return text_chunks + table_chunks + image_chunks

    def close(self):
        self.doc.close()
