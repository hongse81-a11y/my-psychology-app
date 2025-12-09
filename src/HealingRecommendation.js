// src/HealingRecommendation.js
import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FaMusic, FaPalette, FaBook } from 'react-icons/fa'; // 아이콘 사용

function HealingRecommendation({ currentEmotion, analysisSummary }) {
  const [recommendation, setRecommendation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 분석 결과가 없으면 추천하지 않음
    if (!currentEmotion || !analysisSummary) return;

    const fetchRecommendation = async () => {
      setIsLoading(true);
      try {
        const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
        // ★ 최신 모델 적용
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
          사용자는 현재 '[${currentEmotion}]' 상태이고, 심리 분석 결과 '[${analysisSummary}]'라는 조언을 들었어.
          이 사용자에게 심리적 안정을 줄 수 있는 콘텐츠를 추천해줘.
          
          반드시 아래 **JSON 형식**으로만 응답해줘 (Markdown 코드블록 없이 순수 JSON만).
          {
            "music": { "title": "곡명", "artist": "아티스트", "reason": "추천 이유(1문장)" },
            "art": { "title": "작품명", "artist": "화가", "reason": "추천 이유(1문장)" },
            "book": { "title": "책 제목", "author": "저자", "quote": "관련된 명언이나 구절" }
          }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // JSON 파싱 (혹시 모를 백틱 제거)
        const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
        setRecommendation(JSON.parse(cleanJson));

      } catch (error) {
        console.error("추천 로딩 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendation();

  }, [currentEmotion, analysisSummary]); // 감정이나 분석내용이 바뀌면 다시 추천

  if (isLoading) return <p style={{ textAlign: 'center', color: '#888' }}>🎁 당신을 위한 선물을 고르고 있어요...</p>;
  if (!recommendation) return null;

  return (
    <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
      <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>🎁 마음을 위한 선물</h3>
      
      <div style={{ display: 'grid', gap: '15px' }}>
        
        {/* 음악 카드 */}
        <div style={cardStyle}>
          <div style={iconStyle}><FaMusic color="#FF6B6B" /></div>
          <div>
            <h4>🎵 {recommendation.music.title} - {recommendation.music.artist}</h4>
            <p style={{ fontSize: '14px', color: '#666' }}>{recommendation.music.reason}</p>
            <a 
              href={`https://www.youtube.com/results?search_query=${recommendation.music.title}+${recommendation.music.artist}`} 
              target="_blank" 
              rel="noreferrer"
              style={linkStyle}
            >
              ▶ 유튜브로 듣기
            </a>
          </div>
        </div>

        {/* 미술 카드 */}
        <div style={cardStyle}>
          <div style={iconStyle}><FaPalette color="#4ECDC4" /></div>
          <div>
            <h4>🎨 {recommendation.art.title} - {recommendation.art.artist}</h4>
            <p style={{ fontSize: '14px', color: '#666' }}>{recommendation.art.reason}</p>
            <a 
              href={`https://www.google.com/search?tbm=isch&q=${recommendation.art.title}+${recommendation.art.artist}`} 
              target="_blank" 
              rel="noreferrer"
              style={linkStyle}
            >
              🖼 작품 보러가기
            </a>
          </div>
        </div>

        {/* 도서 카드 */}
        <div style={cardStyle}>
          <div style={iconStyle}><FaBook color="#FFD93D" /></div>
          <div>
            <h4>📚 {recommendation.book.title} - {recommendation.book.author}</h4>
            <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>"{recommendation.book.quote}"</p>
          </div>
        </div>

      </div>
    </div>
  );
}

// 스타일 객체들 (간단한 CSS)
const cardStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '15px',
  backgroundColor: 'white',
  borderRadius: '10px',
  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  gap: '15px'
};

const iconStyle = {
  fontSize: '24px',
  padding: '10px',
  backgroundColor: '#f8f9fa',
  borderRadius: '50%',
};

const linkStyle = {
  display: 'inline-block',
  marginTop: '5px',
  fontSize: '13px',
  color: '#007bff',
  textDecoration: 'none',
  fontWeight: 'bold'
};

export default HealingRecommendation;