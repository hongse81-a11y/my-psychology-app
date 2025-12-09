const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'public/favicon.ico')
  });

  // ★ [핵심] 조건문 다 없애고, 무조건 빌드된 파일만 엽니다.
  // 이제 localhost로 접속할 일은 절대 없습니다.
  const startUrl = `file://${path.join(__dirname, 'build/index.html')}`;
  
  win.loadURL(startUrl);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

const { ipcMain } = require('electron');
const { google } = require('googleapis');
const fs = require('fs');

// ★ 구글 시트 저장 심부름꾼 (IPC 통신)
ipcMain.handle('save-to-sheet', async (event, diaryData) => {
  try {
    // 1. 키 파일 경로 설정
    // 개발 중일 땐 현재 폴더, 빌드 후엔 resources 폴더를 찾습니다.
    const keyFilePath = path.join(__dirname, 'google-sheet-key.json');
    const finalKeyPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'google-sheet-key.json') 
      : keyFilePath;

    // 2. 구글 로그인
    const auth = new google.auth.GoogleAuth({
      keyFile: finalKeyPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // 3. 시트 도구 준비
    const sheets = google.sheets({ version: 'v4', auth });
    
    // 4. 데이터 추가하기
    const spreadsheetId = '1OL6aNJHwn2-5bFKWjzVe4vro-ekY0NiPaYrL_l0bZzw';
    
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:E', // 시트 이름과 범위
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[
          diaryData.date,
          diaryData.moodScore,
          diaryData.primaryEmotion,
          diaryData.journal,
          diaryData.counselingResult
        ]],
      },
    });

    return { success: true };

  } catch (error) {
    console.error('시트 저장 실패:', error);
    return { success: false, error: error.message };
  }
});

const nodemailer = require('nodemailer');

// ★ 이메일 보내기 심부름꾼 (IPC 통신)
ipcMain.handle('send-email', async (event, { toEmail, subject, htmlContent, googleAppPassword }) => {
  try {
    // 1. 전송 설정 (Gmail 기준)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: toEmail, // 보내는 사람 = 받는 사람 (나에게 보내기)
        pass: googleAppPassword // 아까 받은 16자리 앱 비밀번호
      }
    });

    // 2. 메일 내용 설정
    const mailOptions = {
      from: `"나만의 심리상담사" <${toEmail}>`,
      to: toEmail,
      subject: subject,
      html: htmlContent
    };

    // 3. 전송!
    await transporter.sendMail(mailOptions);
    return { success: true };

  } catch (error) {
    console.error('메일 전송 실패:', error);
    return { success: false, error: error.message };
  }
});