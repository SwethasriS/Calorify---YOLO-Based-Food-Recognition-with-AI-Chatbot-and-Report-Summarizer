// API Configuration
const API_BASE_URL = 'http://localhost:5000'; // Flask backend
const DETECT_ENDPOINT = '/detect';
// DOM Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

// Form Validation and MongoDB Integration
if (loginForm) {
    loginForm.addEventListener('submit', async(e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
            alert('Please fill in all fields');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('authToken', data.token);
                window.location.href = 'welcome.html';
            } else {
                alert(data.message || 'Login failed');
            }
        } catch (err) {
            console.error('Login error:', err);
            alert('Network error. Please try again.');
        }
    });
}

if (signupForm) {
    signupForm.addEventListener('submit', async(e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (!name || !email || !password || !confirmPassword) {
            alert('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Account created successfully! Redirecting to login...');
                window.location.href = 'login.html';
            } else {
                alert(data.message || 'Registration failed');
            }
        } catch (err) {
            console.error('Registration error:', err);
            alert('Network error. Please try again.');
        }
    });
}

// Food Detection Functionality
document.addEventListener('DOMContentLoaded', function() {
            const foodForm = document.getElementById('foodForm');
            const resultDiv = document.getElementById('result');
            const foodImage = document.getElementById('foodImage');
            const foodResults = document.getElementById('foodResults');

            if (foodForm) {
                foodForm.addEventListener('submit', async(e) => {
                    e.preventDefault();
                    const fileInput = document.getElementById('foodImageUpload');
                    const file = fileInput.files[0];

                    if (!file) {
                        alert('Please select an image file');
                        return;
                    }

                    const formData = new FormData();
                    formData.append('file', file);

                    try {
                        const response = await fetch(API_BASE_URL + DETECT_ENDPOINT, {
                            method: 'POST',
                            body: formData
                        });

                        const data = await response.json();

                        if (response.ok) {
                            // Display results
                            foodImage.src = data.image_url;
                            foodResults.innerHTML = data.food_items.map(item =>
                                `<div class="food-item">
                            <h3>${item.name}</h3>
                            <p>Calories: ${item.calories}</p>
                            <p>Confidence: ${Math.round(item.confidence * 100)}%</p>
                        </div>`
                            ).join('');
                            resultDiv.style.display = 'block';
                        } else {
                            alert(data.error || 'Detection failed');
                        }
                    } catch (err) {
                        console.error('Detection error:', err);
                        alert('Network error. Please try again.');
                    }
                });
            }

            // Logout functionality for welcome page
            document.addEventListener('DOMContentLoaded', function() {
                const logoutBtn = document.getElementById('logout-btn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', function() {
                        localStorage.removeItem('authToken');
                        window.location.href = 'login.html';
                    });
                }
            });

            // Mobile menu toggle
            function toggleMobileMenu() {
                const navLinks = document.querySelector('.nav-links');
                navLinks.classList.toggle('active');
            }