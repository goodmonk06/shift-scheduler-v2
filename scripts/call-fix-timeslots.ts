const JWT_SECRET = process.env.JWT_SECRET || '1Ggzey4jtDqOoP1Dx4B46yjFlAKuCppQRt4vCsWxyukEY+woKu92c3fCzzI41RlJ';
const PORT = process.env.PORT || 3000;

async function callFixTimeSlots() {
  try {
    // まずログインしてトークンを取得
    const loginResponse = await fetch(`http://localhost:${PORT}/api/trpc/auth.login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      console.error('Login failed:', await loginResponse.text());
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.result?.data?.token;

    if (!token) {
      console.error('No token received');
      return;
    }

    console.log('✅ ログイン成功');

    // maintenance.fixWorkTimeSlotsを呼び出し
    const fixResponse = await fetch(`http://localhost:${PORT}/api/trpc/maintenance.fixWorkTimeSlots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({})
    });

    if (!fixResponse.ok) {
      console.error('Fix failed:', await fixResponse.text());
      return;
    }

    const result = await fixResponse.json();
    console.log('✅ データベース修正完了:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('エラー:', error);
  }
}

callFixTimeSlots();
