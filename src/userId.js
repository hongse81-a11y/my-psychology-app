// src/userId.js
export const getUserId = () => {
  // 1. 이미 저장된 이름표가 있는지 확인
  let id = localStorage.getItem('my_app_user_id');
  
  // 2. 없으면 새로 만들기 (랜덤 생성)
  if (!id) {
    id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('my_app_user_id', id);
  }
  
  return id;
};