function verificarLogin() {

  if (
    document.getElementById("usuario").value == "1"
    &&
    document.getElementById("senha").value == "2"
  ){ 

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

