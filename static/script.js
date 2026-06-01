function mudarTema() {

    document.body.classList.toggle("dark");

    let botao = document.getElementById("botaoTema");

    if (botao) {
        if (document.body.classList.contains("dark")) {
            botao.innerHTML = "☀ Modo Claro";
        } else {
            botao.innerHTML = "🌙 Modo Escuro";
        }
    }
}