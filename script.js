// Continue button navigates to conditions page
document.querySelector('.continue-btn').addEventListener('click', function() {
    window.location.href = 'conditions.html';
});

// Condition items click handler
document.querySelectorAll('.condition-item').forEach(item => {
    item.addEventListener('click', function() {
        // Remove active class from all items
        document.querySelectorAll('.condition-item').forEach(i => {
            i.classList.remove('active');
        });
        // Add active class to clicked item
        this.classList.add('active');
        
        const condition = this.dataset.condition;
        console.log('Selected condition:', condition);
        
        // Navigate to condition page after 500ms
        setTimeout(() => {
            window.location.href = `condition.html?type=${condition}`;
        }, 500);
    });
});