/**
 * Custom JavaScript for Atlanta Life Insurance Company Website
 * Handles dropdown navigation functionality
 */

document.addEventListener('DOMContentLoaded', function() {
  // Find all dropdown buttons that have an href attribute (not just "#")
  const dropdownButtons = document.querySelectorAll('.dropdown-toggle[href]:not([href="#"])');
  
  dropdownButtons.forEach(function(button) {
    const href = button.getAttribute('href');
    
    // Skip if href is empty, "#", or a fragment link
    if (!href || href === '#' || href.startsWith('#')) {
      return;
    }
    
    button.addEventListener('click', function(e) {
      // Check if the click is on the button itself or its text content
      // but not on the dropdown arrow or dropdown items
      const isDirectClick = (
        e.target === this || 
        e.target.parentElement === this ||
        (e.target.classList && e.target.classList.contains('nav-link'))
      );
      
      // Check if the click is not on a dropdown item
      const isNotDropdownItem = !e.target.closest('.dropdown-menu');
      
      if (isDirectClick && isNotDropdownItem) {
        // Navigate to the href
        window.location.href = href;
      }
    });
  });
});
