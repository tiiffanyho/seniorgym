// Get condition type from URL
const urlParams = new URLSearchParams(window.location.search);
const conditionType = urlParams.get('type');

// Condition data
const conditionData = {
    arthritis: {
        title: 'Arthritis Recovery Plan',
        description: 'Joint pain and mobility exercises',
        icon: 'fas fa-bone',
        color: '#e74c3c'
    },
    stroke: {
        title: 'Stroke Recovery Plan',
        description: 'Mobility and strength rehabilitation',
        icon: 'fas fa-brain',
        color: '#9b59b6'
    },
    osteoporosis: {
        title: 'Osteoporosis Recovery Plan',
        description: 'Bone strengthening exercises',
        icon: 'fas fa-spine',
        color: '#f39c12'
    },
    dementia: {
        title: 'Dementia Support Plan',
        description: 'Cognitive and physical engagement',
        icon: 'fas fa-head-side-virus',
        color: '#3498db'
    },
    hypertension: {
        title: 'Hypertension Management Plan',
        description: 'Cardiovascular health management',
        icon: 'fas fa-heart',
        color: '#e74c3c'
    },
    sarcopenia: {
        title: 'Sarcopenia Recovery Plan',
        description: 'Muscle building and strength training',
        icon: 'fas fa-dumbbell',
        color: '#27ae60'
    }
};

// Update page with condition data
const data = conditionData[conditionType] || conditionData.arthritis;

document.getElementById('conditionTitle').textContent = data.title;
document.getElementById('conditionDescription').textContent = data.description;
document.getElementById('heroIcon').innerHTML = `<i class="${data.icon}"></i>`;
document.getElementById('heroIcon').style.color = data.color;

// Exercise button click handler
document.querySelectorAll('.start-exercise-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        alert('Starting exercise - Real-time motion guidance will begin!');
    });
});