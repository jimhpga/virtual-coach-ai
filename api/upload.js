// 📁 File: api/upload.js

import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new formidable.IncomingForm({
    keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    uploadDir: './uploads',
  });

  await fs.promises.mkdir('./uploads', { recursive: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parse error:', err);
      return res.status(500).json({ error: 'Failed to parse form' });
    }

    if (!files.video) {
      return res.status(400).json({ error: 'No video file received' });
    }

    const uploadedFile = files.video[0];
    console.log('✅ Uploaded video file:', uploadedFile.filepath);

    // Success response
    return res.status(200).json({ success: true, filepath: uploadedFile.filepath });
  });
}
