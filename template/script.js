// =====================
// API Configuration
// =====================
const AUTH_API_URL = 'http://localhost:3001'; // Node.js auth endpoints
const DETECT_API_URL = 'http://localhost:5000'; // Flask detection endpoint
const DETECT_ENDPOINT = '/detect';

// =====================
// DOM Elements
// =====================
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

// =====================
// Login Handler
// =====================
if (loginForm) {
    loginForm.addEventListener('submit', async(e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!email || !password) {
            alert('Please fill in all fields');
            return;
        }

        try {
            const response = await fetch(`${AUTH_API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password }),
                mode: 'cors',
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                // Store token and user data immediately
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('currentUser', JSON.stringify(data.user));

                // Redirect with email parameter
                window.location.href = `welcome.html?email=${encodeURIComponent(email)}`;
            } else {
                alert(data.message || 'Login failed');
            }
        } catch (err) {
            console.error('Login error:', err);
            alert('Network error. Please try again.');
        }
    });
}

// =====================
// Signup Handler
// =====================
if (signupForm) {
    signupForm.addEventListener('submit', async(e) => {
        e.preventDefault();
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const calorieGoal = document.getElementById('calorie-goal').value;

        if (!name || !email || !password || !confirmPassword || !calorieGoal) {
            alert('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        try {
            const response = await fetch(`${AUTH_API_URL}/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    calorie_goal: calorieGoal
                })
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

// =====================
// Food Detection Logic
// =====================
document.addEventListener('DOMContentLoaded', function() {
    const foodForm = document.getElementById('foodForm');
    const resultDiv = document.getElementById('result');
    const foodImage = document.getElementById('foodImage');
    const foodResults = document.getElementById('foodResults');
    const logoutBtn = document.getElementById('logout-btn');

    // Check if we're on the welcome page and load user data
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (welcomeMessage) {
        loadUserDataByEmail();
    }

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
                const response = await fetch(`${DETECT_API_URL}${DETECT_ENDPOINT}`, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (response.ok) {
                    foodImage.src = data.image_url;

                    const sortedItems = data.food_items.sort((a, b) => b.confidence - a.confidence);

                    foodResults.innerHTML = sortedItems.map(item =>
                        `<div class="food-item">
                            <h3>${item.name}</h3>
                            <p><strong>Calories:</strong> ${item.calories} kcal</p>
                            <p><strong>Confidence:</strong> ${Math.round(item.confidence * 100)}%</p>
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

    // Logout Functionality
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('healthifyUser');
            window.location.href = 'login.html';
        });
    }
});

// Function to load user data for welcome page
async function loadUserDataByEmail() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const welcomeMessage = document.getElementById('welcomeMessage');
    const calorieInfo = document.getElementById('calorieInfo');

    // Try to use cached user data if available
    let cachedUser;
    try {
        cachedUser = JSON.parse(localStorage.getItem('currentUser'));
        if (cachedUser && cachedUser.name) {
            welcomeMessage.querySelector('h1').textContent = `Welcome, ${cachedUser.name}!`;
            console.log('Using cached user data');
        }
    } catch (storageError) {
        console.warn('Failed to access localStorage:', storageError);
    }

    try {
        // Attempt to fetch fresh user data with retry logic
        const maxRetries = 3;
        let retryCount = 0;
        let userData;

        while (retryCount < maxRetries) {
            try {
                const userResponse = await fetch(`${AUTH_API_URL}/api/user/current`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                });

                if (userResponse.status === 500) {
                    console.warn(`User API returned 500 (attempt ${retryCount + 1}/${maxRetries})`);
                    if (retryCount < maxRetries - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                        retryCount++;
                        continue;
                    }
                    throw new Error('User service temporarily unavailable');
                }

                if (!userResponse.ok) {
                    throw new Error(`HTTP ${userResponse.status}`);
                }

                userData = await userResponse.json();
                break;
            } catch (err) {
                if (retryCount === maxRetries - 1) {
                    console.warn('Final attempt failed, using cached data if available');
                    if (!cachedUser) {
                        throw err;
                    }
                }
                retryCount++;
            }
        }

        // Cache the fresh user data
        try {
            localStorage.setItem('currentUser', JSON.stringify(userData));
            welcomeMessage.querySelector('h1').textContent = `Welcome, ${userData.name}!`;
        } catch (storageError) {
            console.warn('Failed to cache user data:', storageError);
            welcomeMessage.querySelector('h1').textContent = `Welcome, ${userData.name}!`;
        }

        // Fetch calorie data with fallback endpoints
        let calorieData;
        const calorieEndpoints = ['/api/calories', '/api/user/calories'];

        for (const endpoint of calorieEndpoints) {
            try {
                const calorieResponse = await fetch(`${AUTH_API_URL}${endpoint}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (calorieResponse.status === 404 && endpoint !== calorieEndpoints[calorieEndpoints.length - 1]) {
                    continue;
                }

                if (!calorieResponse.ok) {
                    throw new Error(`HTTP ${calorieResponse.status}`);
                }

                calorieData = await calorieResponse.json();
                console.log('Calorie data loaded from:', endpoint);
                break;
            } catch (calorieError) {
                console.warn(`Calorie fetch failed (${endpoint}):`, calorieError.message);
                if (endpoint === calorieEndpoints[calorieEndpoints.length - 1]) {
                    throw new Error('All calorie endpoints failed');
                }
            }
        }

        updateWelcomeUI(userData || cachedUser, calorieData);
    } catch (error) {
        console.error('Error loading user data:', {
            message: error.message,
            status: error.status,
            stack: error.stack
        });

        // More detailed error messages
        let errorMessage;
        if (error.status === 500) {
            errorMessage = 'Our servers are busy. Using cached data.';
        } else if (error.message.includes('NetworkError')) {
            errorMessage = 'Network issues detected. Please check your connection.';
        } else {
            errorMessage = 'Trouble loading fresh data. Using cached information.';
        }

        calorieInfo.innerHTML = `
            <p class="error">${errorMessage}</p>
            ${cachedUser ? '<p class="info">Showing last known data</p>' : ''}
        `;
        calorieInfo.classList.add('error');

        // If we have cached data but no fresh data, still try to load calories
        if (cachedUser) {
            try {
                const calorieResponse = await fetch(`${AUTH_API_URL}/api/calories`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (calorieResponse.ok) {
                    const calorieData = await calorieResponse.json();
                    updateWelcomeUI(cachedUser, calorieData);
                    return;
                }
            } catch (calorieError) {
                console.warn('Failed to fetch calories:', calorieError);
            }
        }

        // Fallback to cached data if available
        const cachedUserFallback = JSON.parse(localStorage.getItem('currentUser'));
        if (cachedUserFallback) {
            updateWelcomeUI(cachedUserFallback, { current: { consumed: 0 }, goal: 2000 });
        }

        if (error.status === 401) {
            setTimeout(() => window.location.href = 'login.html', 2000);
        }
    }
}

// Update welcome UI with user and calorie data
function updateWelcomeUI(user, calorieData) {
    const welcomeMessage = document.querySelector('#welcomeMessage');
    const calorieInfo = document.getElementById('calorieInfo');

    if (!user || !user.name) {
        welcomeMessage.innerHTML = `
            <h1>Welcome!</h1>
            <p>Could not load user data. Please <a href="login.html">login again</a>.</p>
        `;
        return;
    }

    const consumed = calorieData.current.consumed || 0;
    const goal = calorieData.goal;
    const remaining = Math.max(0, goal - consumed);
    const percentage = Math.min(100, Math.round((consumed / goal) * 100));

    welcomeMessage.innerHTML = `
        <h1>Welcome, ${user.name}!</h1>
        <div class="user-profile">
            <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
            <p><strong>Member Since:</strong> ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
            <div class="calorie-summary">
                <p><strong>Consumed:</strong> ${consumed} kcal</p>
                <p><strong>Remaining:</strong> ${remaining} kcal</p>
                <p><strong>Daily Goal:</strong> ${goal} kcal</p>
            </div>
            <div class="calorie-progress">
                <div class="progress-bar" style="width: ${percentage}%"></div>
            </div>
            <p class="progress-text">${consumed} / ${goal} kcal (${percentage}%)</p>
        </div>
    `;

    calorieInfo.style.display = 'none';
}

// =====================
// Mobile Menu Toggle
// =====================
function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('active');
}