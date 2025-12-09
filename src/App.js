import React, { useState, useEffect } from 'react';
import ChildhoodSurvey from './ChildhoodSurvey';
import DailyCheckIn from './DailyCheckIn';
import { db } from './firebase';
import { doc, getDoc } from "firebase/firestore";
import { getUserId } from './userId'; // 사용자 ID 가져오기

function App() {
  // 상태 관리: 로딩중? 데이터있음?
  const [loading, setLoading] = useState(true);
  const [hasChildhoodData, setHasChildhoodData] = useState(false);

  useEffect(() => {
    // 앱이 켜지면 Firebase에서 내 데이터를 조회합니다.
    const checkUserHistory = async () => {
      try {
        const userId = getUserId(); // 내 ID 가져오기
        const docRef = doc(db, "users", userId); // 내 ID로 문서 찾기

        // ★ [중요] 이 줄이 빠져서 에러가 났던 겁니다!
        // 데이터베이스에서 문서를 가져와서 'docSnap'이라는 변수에 담습니다.
        const docSnap = await getDoc(docRef); 

        // 데이터가 있고, 그 안에 심리분석 결과(childhood_data)도 있다면?
        if (docSnap.exists() && docSnap.data().childhood_data) {
          setHasChildhoodData(true); // "아, 구면이시군요!"
        } else {
          setHasChildhoodData(false); // "초면입니다. 설문이 필요해요."
        }
      } catch (error) {
        console.error("데이터 확인 중 오류:", error);
      } finally {
        setLoading(false); // 확인 끝! 로딩 해제
      }
    };

    checkUserHistory();
  }, []);

  // 1. 아직 검사 중이면 로딩 화면
  if (loading) {
    return (
      <div className="app-container" style={{ textAlign: 'center', marginTop: '100px' }}>
        <h2>⏳ 마음을 읽어오는 중...</h2>
      </div>
    );
  }

  // 2. 데이터가 있으면 -> 바로 일기장(메인)으로!
  if (hasChildhoodData) {
    return (
      <div className="app-container">
        <DailyCheckIn />
      </div>
    );
  }

  // 3. 데이터가 없으면 -> 심층 설문조사 화면으로!
  return (
    <div className="app-container">
      <ChildhoodSurvey onComplete={() => setHasChildhoodData(true)} />
    </div>
  );
}

export default App;