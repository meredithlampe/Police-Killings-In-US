// Our modules are designed to execute when imported
require('./ethnicty.js');
require('./the_victims.js');

$(document).ready(function() {
    $('#fullpage').fullpage({
        autoScrolling: false,
        fitToSection: false,
        navigation: true,
        navigationPosition: 'left',
        menu: '#menu'
    });
});

