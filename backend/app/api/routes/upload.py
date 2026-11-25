import os
import mimetypes
from bson import ObjectId
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from fastapi.responses import StreamingResponse
from app.database.connection import get_gridfs, get_database

router = APIRouter(prefix="/upload", tags=["Upload"])

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/screenshot")
async def upload_screenshot(
    proof: UploadFile = File(None),
    file: UploadFile = File(None)
):
    upload = proof or file
    if not upload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file uploaded. Expected 'proof' or 'file' form-data field."
        )
    
    filename = upload.filename or "proof_screenshot.png"
    contents = await upload.read()
    content_type = upload.content_type or mimetypes.guess_type(filename)[0] or "image/png"
    
    file_id = None
    try:
        gridfs = get_gridfs()
        grid_in = gridfs.open_upload_stream(filename, metadata={"contentType": content_type})
        await grid_in.write(contents)
        await grid_in.close()
        file_id = str(grid_in._id)
    except Exception as e:
        # Fallback to local disk file storage if GridFS fails
        import uuid
        file_id = f"local_{uuid.uuid4().hex}"
        local_path = os.path.join(UPLOAD_DIR, f"{file_id}_{filename}")
        with open(local_path, "wb") as f:
            f.write(contents)

    # Return the file URL and file name
    file_url = f"/api/upload/file/{file_id}"
    return {
        "fileUrl": file_url,
        "fileName": filename
    }

@router.get("/file/{file_id}")
async def get_uploaded_file(file_id: str):
    if file_id.startswith("local_"):
        # Local file fallback
        matches = [f for f in os.listdir(UPLOAD_DIR) if f.startswith(file_id)]
        if not matches:
            raise HTTPException(status_code=404, detail="File not found")
        local_path = os.path.join(UPLOAD_DIR, matches[0])
        guessed_type, _ = mimetypes.guess_type(local_path)
        def iterfile():
            with open(local_path, mode="rb") as file_like:
                yield from file_like
        return StreamingResponse(iterfile(), media_type=guessed_type or "image/png")

    try:
        obj_id = ObjectId(file_id)
        gridfs = get_gridfs()
        grid_out = await gridfs.open_download_stream(obj_id)
        content_type = grid_out.metadata.get("contentType", "image/png") if grid_out.metadata else "image/png"
        
        async def file_streamer():
            while chunk := await grid_out.readchunk():
                yield chunk

        return StreamingResponse(file_streamer(), media_type=content_type)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found or invalid file id")
