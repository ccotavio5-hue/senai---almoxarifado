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


function info(){
    alert ("Essa é a pagina de Estoque, aqui você consegue ver os itens armazenados até o momento")
}