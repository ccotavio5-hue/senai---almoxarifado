function verificarLogin() {

  const usuario = document.getElementById("usuario").value;
  const senha = document.getElementById("senha").value;

  const usuarioCorreto = "1";
  const senhaCorreta = "2";

  if (usuario === usuarioCorreto && senha === senhaCorreta) {

    window.location.href = "estoque.html";

  } else {

    Swal.fire({
      icon: 'error',
      title: 'Erro!',
      text: 'Usuário ou senha incorretos!',
      confirmButtonColor: '#3c61a5'
    });

  }

}