import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Setup multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Express server is running' });
  });

  // API endpoint for file upload
  app.post('/api/upload', upload.single('photo'), async (req, res) => {
    try {
      const { name, contact } = req.body;
      const file = req.file;

      if (!name || !contact || !file) {
        return res.status(400).json({ error: '이름, 연락처, 사진을 모두 입력해주세요.' });
      }

      // Check Google Apps Script configuration
      const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
      let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

      if (!scriptUrl || !folderId) {
        console.error('Google Apps Script URL or Folder ID is missing.');
        return res.status(500).json({ 
          error: '구글 드라이브 연동 설정이 완료되지 않았습니다. 관리자에게 문의하세요.',
          details: 'GOOGLE_APPS_SCRIPT_URL, GOOGLE_DRIVE_FOLDER_ID 환경변수가 필요합니다.'
        });
      }

      // Clean up folder ID if user accidentally pasted the whole URL or included query parameters
      if (folderId.includes('?')) {
        folderId = folderId.split('?')[0];
      }
      if (folderId.includes('/')) {
        const parts = folderId.split('/');
        folderId = parts[parts.length - 1];
      }

      // Sanitize filename
      const safeName = name.replace(/[^a-zA-Z0-9가-힣]/g, '');
      const safeContact = contact.replace(/[^0-9]/g, '');
      const ext = path.extname(file.originalname) || '.jpg';
      
      // Add timestamp and random string to prevent overwriting files from the same person
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const randomStr = Math.random().toString(36).substring(2, 6);
      const fileName = `${safeName}_${safeContact}_${timestamp}_${randomStr}${ext}`;

      // Convert file buffer to base64
      const fileData = file.buffer.toString('base64');

      // Prepare form data for Apps Script
      const formData = new URLSearchParams();
      formData.append('folderId', folderId);
      formData.append('fileName', fileName);
      formData.append('mimeType', file.mimetype);
      formData.append('fileData', fileData);

      // Upload to Google Drive via Google Apps Script
      const response = await fetch(scriptUrl, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '구글 드라이브 저장 중 오류가 발생했습니다.');
      }

      res.json({ success: true, fileId: result.fileId, fileName });
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({ error: error.message || '업로드 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
    }
  });

  // Global error handler for Express
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Express error:', err);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Static file serving for production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
