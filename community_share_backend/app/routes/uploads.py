import io
import os
import uuid
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import FileResponse
from PIL import Image, ImageOps
from app.utils.auth import get_current_user_id

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/data/uploads")


@router.post("/")
async def upload_file(file: UploadFile = File(...), current_user_id: int = Depends(get_current_user_id)):
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        raise HTTPException(status_code=400, detail="Only image files are allowed (jpg, png, gif, webp)")

    if file.size and file.size > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 20MB)")

    content = await file.read()

    if ext == ".gif":
        filename = f"{uuid.uuid4().hex}{ext}"
    else:
        try:
            image = Image.open(io.BytesIO(content))
            image = ImageOps.exif_transpose(image)
            if image.mode in ("RGBA", "P", "LA", "L"):
                image = image.convert("RGB")
            # Resize images larger than 1600px on any side and compress
            image.thumbnail((1600, 1600), Image.LANCZOS)
            output = io.BytesIO()
            image.save(output, format="JPEG", quality=85, optimize=True)
            content = output.getvalue()
            filename = f"{uuid.uuid4().hex}.jpg"
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image file")

    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(content)

    return {"url": f"/api/uploads/{filename}"}


@router.get("/{filename}")
async def get_file(filename: str):
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath)
