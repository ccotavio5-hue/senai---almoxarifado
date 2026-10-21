const GROQ_API_KEY = ""; 

async function ia() {
  const perguntaInput = document.getElementById("perguntaInput");
  const respostaDiv = document.getElementById("resultado");

  const pergunta = perguntaInput ? perguntaInput.value : "";

  if (!pergunta.trim()) {
    alert("Por favor, digite uma dúvida sobre a ferramenta ou item!");
    return;
  }

  respostaDiv.innerText = "A consultar o assistente de almoxarifado...";

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b", // Modelo válido da Groq
        temperature: 0.7,
        max_tokens: 1024,
        messages: [
          {
            role: "system",
            content: "Você é um assistente especialista em almoxarifado, ferramentas e materiais de construção/manutenção. Responda de forma clara e objetiva para que serve a ferramenta, quais os cuidados de segurança ao utilizá-la e como deve ser armazenada."
          },
          {
            role: "user",
            content: pergunta
          }
        ]
      })
    });

    const data = await response.json();

    if (data.choices && data.choices[0]) {
      respostaDiv.textContent = data.choices[0].message.content;
    } else {
      respostaDiv.innerText = "Não foi possível obter uma resposta do assistente.";
    }
  } catch (error) {
    console.error("Erro na API:", error);
    respostaDiv.innerText = "Erro ao ligar ao assistente de almoxarifado.";
  }
}
function ocultarOverlay(elemento) {
  elemento.style.display = 'none';
}
