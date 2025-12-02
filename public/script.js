document.addEventListener("DOMContentLoaded", () => {
    document.body.style.opacity = "0";
    setTimeout(() => {
      document.body.style.opacity = "1";
    }, 100);
  });
  
  function masukDatabase() {
    document.body.style.transition = "opacity 1s ease";
    document.body.style.opacity = "0";
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1000);
  }
  
  document.addEventListener("mousemove", (e) => {
    const x = (window.innerWidth / 2 - e.pageX) / 30;
    const y = (window.innerHeight / 2 - e.pageY) / 30;
  
    const logo = document.querySelector(".logo-wrapper");
    const left = document.querySelector(".side-img.left");
    const right = document.querySelector(".side-img.right");
  
    if (logo) logo.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
    if (left) left.style.transform = `translateY(-50%) translateX(${x}px)`;
    if (right) right.style.transform = `translateY(-50%) translateX(${-x}px)`;
  });