module.exports = {
  VertexAI: function VertexAI() {
    return {
      getGenerativeModel: () => ({
        generateContent: async () => ({ response: { text: () => '' } })
      })
    }
  }
}
