const bcrypt = require('bcrypt');

async function testPassword() {
  const plainPassword = 'password123';
  const hashedFromDB = '$2b$10$TElmXWrtIsd7KgTcWlJHe.wdMgv1JJYxuouecFAZTZA3caKx/Mpg2';
  
  console.log('Testing password verification...');
  console.log('Plain password:', plainPassword);
  console.log('Hashed from DB:', hashedFromDB);
  
  try {
    const isMatch = await bcrypt.compare(plainPassword, hashedFromDB);
    console.log('Password match:', isMatch);
    
    // Also test with other common passwords
    const commonPasswords = ['admin', '123456', 'password', 'test123'];
    for (const pwd of commonPasswords) {
      const match = await bcrypt.compare(pwd, hashedFromDB);
      console.log(`Password "${pwd}" match:`, match);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testPassword();