/ /api/upload.js

import fs from 'fs';
import path from 'path';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const form = new formidable.IncomingForm();
  form.uploadDir = path.join(process.cwd(), 'public/uploads');
  form.keepExtensions = true;

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Form parse error:', err);
      res.status(500).json({ error: 'Upload failed' });
      return;
    }

    const file = files.video;
    if (!file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    res.status(200).json({ message: 'File uploaded', filename: path.basename(file.filepath) });
  });
}
