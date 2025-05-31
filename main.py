from flask import Flask, request, jsonify
import base64
import tempfile
import fitz  # PyMuPDF
import cv2
import numpy as np
import os

app = Flask(__name__)

CASCADE_PATH = "haarcascade.xml"  # Ensure this XML file is present

@app.route('/extract-photo', methods=['POST'])
def extract_photo():
    try:
        data = request.get_json()
        pdf_base64 = data.get('pdf_base64')

        if not pdf_base64:
            return jsonify({'error': 'Missing pdf_base64'}), 400

        # Save PDF temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as pdf_file:
            pdf_file.write(base64.b64decode(pdf_base64))
            pdf_path = pdf_file.name

        print("Saved PDF to:", pdf_path)

        # Open PDF
        doc = fitz.open(pdf_path)
        face_image_base64 = None
        face_cascade = cv2.CascadeClassifier(CASCADE_PATH)

        for page_index in range(len(doc)):
            page = doc[page_index]
            images = page.get_images(full=True)

            print(f"Page {page_index + 1} has {len(images)} image(s)")

            for img_index, img in enumerate(images):
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]

                # Convert to NumPy array
                npimg = np.frombuffer(image_bytes, np.uint8)
                img_cv = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

                if img_cv is None:
                    continue

                # Convert to grayscale for face detection
                gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
                faces = face_cascade.detectMultiScale(gray, 1.1, 4)

                print(f" → Image {img_index + 1}: Found {len(faces)} face(s)")

                if len(faces) > 0:
                    # Found at least one face — assume this is the profile image
                    face_image_base64 = base64.b64encode(image_bytes).decode("utf-8")
                    break

            if face_image_base64:
                break

        doc.close()
        os.remove(pdf_path)

        if face_image_base64:
            return jsonify({'image_base64': face_image_base64})
        else:
            return jsonify({'error': 'No face found in any images'}), 404

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    import os
port = int(os.environ.get("PORT", 5000))
app.run(host='0.0.0.0', port=port)

