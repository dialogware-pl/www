module.exports = {
    id: 'auth-example',
    title: 'Authentication Example',
    code: `
async function authenticate(username, password) {
  // Example code here
}
  `,
    tests: [
        {
            input: { username: 'test', password: 'test123' },
            expectedOutput: { success: true },
            description: 'Should authenticate valid credentials'
        }
    ]
};
