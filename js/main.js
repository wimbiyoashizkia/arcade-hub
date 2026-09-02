console.log('NeonPoi Arcade loaded.');

var toggle = document.getElementById('navToggle');
var navLinks = document.querySelector('.nav-links');

if (toggle && navLinks) {
  toggle.addEventListener('click', function() {
    navLinks.classList.toggle('active');
  });
}
