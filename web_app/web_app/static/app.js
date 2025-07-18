// static/app.js
document.addEventListener('DOMContentLoaded', function() {
    // Animate title letters
    const title = document.getElementById('animated-title');
    const text = title.innerText;
    title.innerText = '';

    const animateTitle = () => {
        let i = 0;
        const interval = setInterval(() => {
            if (i < text.length) {
                const span = document.createElement('span');
                span.textContent = text[i];
                span.style.animationDelay = `${i * 0.1}s`;
                title.appendChild(span);
                i++;
            } else {
                clearInterval(interval);
            }
        }, 100);
    };

    animateTitle();

    // File upload handling
    const fileInput = document.getElementById('file-input');
    const fileName = document.getElementById('file-name');

    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            fileName.textContent = this.files[0].name;
        } else {
            fileName.textContent = 'No file chosen';
        }
    });

    // Image Detection Form
    const uploadForm = document.getElementById('upload-form');
    const imageResultsContainer = document.getElementById('image-detection-results');
    const detectedFoodsContainer = document.querySelector('.detected-foods');
    const imageCalorieCount = document.querySelector('#image-detection-results .calorie-count');
    const resultImage = document.getElementById('result-image');
    const weightAdjustmentModal = document.getElementById('weight-adjustment-modal');

    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const formData = new FormData(this);

        // Show loading state
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        submitBtn.disabled = true;

        fetch('/detect_image', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errData => {
                        // Handle structured error responses
                        throw new Error(errData.error || `Server responded with status: ${response.status}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (!data.success) {
                    throw new Error(data.error || 'Failed to process image');
                }

                // Clear previous results
                detectedFoodsContainer.innerHTML = '';

                // Calculate total calories for the image detection
                let totalDetectedCalories = 0;

                // Display detected foods with accept/reject buttons
                for (const [food, info] of Object.entries(data.detected_foods)) {
                    const calories = info.calories_per_100g * info.weight / 100;
                    totalDetectedCalories += calories;

                    const foodItem = document.createElement('div');
                    foodItem.className = 'food-item';
                    foodItem.innerHTML = `
                        <div class="food-item-details">
                            <div class="food-name">${food} (${info.count} ${info.count > 1 ? 'items' : 'item'})</div>
                            <div class="gram-control">
                                <button class="gram-btn decrease-weight" data-food="${food}">-</button>
                                <div class="weight-display">
                                    <input type="number" class="gram-input" value="${info.weight}" min="1" data-food="${food}" data-calories-per-100g="${info.calories_per_100g}">
                                    <span class="gram-unit">g</span>
                                </div>
                                <button class="gram-btn increase-weight" data-food="${food}">+</button>
                            </div>
                        </div>
                        <div class="food-calories" data-food="${food}">${calories.toFixed(2)} kcal</div>
                        <div class="food-actions">
                            <button class="accept-btn detection-accept" data-food="${food}" data-calories="${calories}" data-weight="${info.weight}" data-count="${info.count}" data-calories-per-100g="${info.calories_per_100g}">
                                <i class="fas fa-check"></i> Add
                            </button>
                            <button class="reject-btn detection-reject">
                                <i class="fas fa-times"></i> Reject
                            </button>
                        </div>
                    `;
                    detectedFoodsContainer.appendChild(foodItem);
                }

                // Update the total calories display
                imageCalorieCount.textContent = totalDetectedCalories.toFixed(2);

                // Show results container
                imageResultsContainer.classList.remove('hidden');

                // Only display processed image if URL is provided
                if (data.image_url) {
                    resultImage.src = data.image_url;
                } else {
                    resultImage.style.display = 'none';
                }

                // Add pulse animation to the results
                imageResultsContainer.style.animation = 'none';
                setTimeout(() => {
                    imageResultsContainer.style.animation = 'fadeIn 0.5s ease';
                }, 10);

                // Add event listeners for weight adjustment
                setupWeightControls();
            })
            .catch(error => {
                console.error('Error:', error);
                // Show error in a more user-friendly way
                const errorElement = document.createElement('div');
                errorElement.className = 'error-message';
                errorElement.textContent = error.message;

                // Clear previous results and show error
                detectedFoodsContainer.innerHTML = '';
                detectedFoodsContainer.appendChild(errorElement);

                // Ensure results container is visible to show error
                imageResultsContainer.classList.remove('hidden');
            })
            .finally(() => {
                // Restore button state
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            });
    });

    // Setup weight adjustment controls
    function setupWeightControls() {
        // Add event listeners to weight adjustment buttons
        document.querySelectorAll('.decrease-weight').forEach(btn => {
            btn.addEventListener('click', function() {
                const foodName = this.getAttribute('data-food');
                const inputElement = document.querySelector(`.gram-input[data-food="${foodName}"]`);
                let currentValue = parseInt(inputElement.value);
                if (currentValue > 1) {
                    currentValue -= 10;
                    if (currentValue < 1) currentValue = 1;
                    inputElement.value = currentValue;
                    updateCalories(foodName, currentValue);
                }
            });
        });

        document.querySelectorAll('.increase-weight').forEach(btn => {
            btn.addEventListener('click', function() {
                const foodName = this.getAttribute('data-food');
                const inputElement = document.querySelector(`.gram-input[data-food="${foodName}"]`);
                let currentValue = parseInt(inputElement.value);
                currentValue += 10;
                inputElement.value = currentValue;
                updateCalories(foodName, currentValue);
            });
        });

        document.querySelectorAll('.gram-input').forEach(input => {
            input.addEventListener('change', function() {
                const foodName = this.getAttribute('data-food');
                let value = parseInt(this.value);
                if (isNaN(value) || value < 1) {
                    value = 1;
                    this.value = value;
                }
                updateCalories(foodName, value);
            });
        });
    }

    // Update calories based on weight change
    function updateCalories(foodName, weight) {
        const caloriesPer100g = parseFloat(document.querySelector(`.gram-input[data-food="${foodName}"]`).getAttribute('data-calories-per-100g'));
        const calories = (caloriesPer100g * weight) / 100;

        // Update the calories display for this food
        const caloriesElement = document.querySelector(`.food-calories[data-food="${foodName}"]`);
        caloriesElement.textContent = `${calories.toFixed(2)} kcal`;

        // Update the "Add" button with new values
        const addButton = document.querySelector(`.detection-accept[data-food="${foodName}"]`);
        addButton.setAttribute('data-calories', calories);
        addButton.setAttribute('data-weight', weight);

        // Update total calories
        updateTotalDetectedCalories();
    }

    // Update total detected calories
    function updateTotalDetectedCalories() {
        let total = 0;
        document.querySelectorAll('.food-calories').forEach(element => {
            const calories = parseFloat(element.textContent);
            if (!isNaN(calories)) {
                total += calories;
            }
        });

        imageCalorieCount.textContent = total.toFixed(2);
        updateCombinedCalories();
    }

    // Manual Entry Form
    const manualForm = document.getElementById('manual-entry-form');
    const manualResultsContainer = document.getElementById('manual-entry-results');
    const foodInfoContainer = document.querySelector('.food-info');
    const manualFoodName = document.querySelector('#manual-entry-results .food-name');
    const manualCalorieCount = document.querySelector('#manual-entry-results .calorie-count');
    const sourceValue = document.querySelector('.source-value');
    const savedFoodsList = document.getElementById('saved-foods-list');
    const manualTotalCalories = document.querySelector('.manual-total-calories');
    const clearListBtn = document.getElementById('clear-list');
    const combinedCalorieCount = document.querySelector('.combined-calorie-count');

    // Store the manually added foods
    let savedFoods = [];

    let savedFoodsFromStorage = localStorage.getItem('savedFoods');
    if (savedFoodsFromStorage) {
        try {
            savedFoods = JSON.parse(savedFoodsFromStorage);
            updateSavedFoodsList();
            updateTotalNutrition();
        } catch (e) {
            console.error('Error loading saved foods from storage', e);
            localStorage.removeItem('savedFoods');
        }
    }

    manualForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const foodName = document.getElementById('food-name').value;
        const quantity = document.getElementById('quantity').value;

        // Show loading state
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating...';
        submitBtn.disabled = true;

        fetch('/manual_entry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    food_name: foodName,
                    quantity: parseInt(quantity)
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server responded with status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Display food info
                    // Display food name and quantity
                    let displayName = data.food;
                    if (data.matched_name && data.food.toLowerCase() !== data.matched_name.toLowerCase()) {
                        displayName += ` (matched to ${data.matched_name})`;
                    }
                    manualFoodName.textContent = `${displayName} (${data.quantity}g)`;

                    // Display calories
                    manualCalorieCount.textContent = data.calories;

                    // Display source information
                    let sourceText = '';
                    switch (data.source) {
                        case 'exact_match':
                            sourceText = 'Exact Match';
                            break;
                        case 'case_insensitive_match':
                            sourceText = 'Case-Insensitive Match';
                            break;
                        case 'partial_match':
                            sourceText = 'Partial Match';
                            break;
                        case 'estimate':
                            sourceText = 'Estimated Value';
                            break;
                        default:
                            sourceText = 'Unknown Source';
                    }
                    sourceValue.textContent = sourceText;

                    // Display note if available
                    if (data.note) {
                        const noteElement = document.createElement('div');
                        noteElement.className = 'note';
                        noteElement.textContent = data.note;
                        foodInfoContainer.appendChild(noteElement);
                    }

                    // Show results container
                    manualResultsContainer.classList.remove('hidden');

                    // Add pulse animation to the results
                    manualResultsContainer.style.animation = 'none';
                    setTimeout(() => {
                        manualResultsContainer.style.animation = 'fadeIn 0.5s ease';
                    }, 10);

                    // Reset form
                    document.getElementById('food-name').value = '';
                    document.getElementById('quantity').value = '100';
                } else {
                    alert('Error: ' + (data.error || 'Failed to calculate calories'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error calculating calories. Please try again.');
            })
            .finally(() => {
                // Restore button state
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            });
    });

    // Update saved foods list
    function updateSavedFoodsList() {
        savedFoodsList.innerHTML = '';

        if (savedFoods.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-list-message';
            emptyMessage.innerHTML = 'No foods added yet. Add foods using the form above.';
            savedFoodsList.appendChild(emptyMessage);
        } else {
            savedFoods.forEach((food, index) => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${food.name} (${food.quantity || '100'}g)</span>
                    <div>
                        <span>${food.calories.toFixed(2)} kcal</span>
                        <button class="remove-item" data-index="${index}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                savedFoodsList.appendChild(li);
            });
        }

        // Add event listeners for remove buttons
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                savedFoods.splice(index, 1);
                updateSavedFoodsList();
                updateTotalNutrition();

                // Save to local storage
                localStorage.setItem('savedFoods', JSON.stringify(savedFoods));
            });
        });
    }

    // Update total nutrition and combined calories
    function updateTotalNutrition() {
        // Calculate total calories from saved foods
        let totalCalories = 0;
        savedFoods.forEach(food => {
            totalCalories += parseFloat(food.calories);
        });

        // Update manual total calories
        manualTotalCalories.textContent = totalCalories.toFixed(2);

        // Update combined total
        updateCombinedCalories();
    }

    // Update combined calories (from both detection and manual entry)
    function updateCombinedCalories() {
        // Get calories from manual entries
        let manualTotal = parseFloat(manualTotalCalories.textContent);
        if (isNaN(manualTotal)) manualTotal = 0;

        // Get calories from the detected foods (if visible)
        let detectedTotal = 0;
        if (!imageResultsContainer.classList.contains('hidden')) {
            detectedTotal = parseFloat(imageCalorieCount.textContent);
            if (isNaN(detectedTotal)) detectedTotal = 0;
        }

        // Update combined total
        const total = manualTotal + detectedTotal;
        combinedCalorieCount.textContent = total.toFixed(2);
        return total;
    }

    // Add to Goal button functionality
    document.querySelector('.add-goal-btn').addEventListener('click', function() {
        const totalCalories = updateCombinedCalories();
        const caloriesToAdd = parseFloat(totalCalories.toFixed(2));

        if (isNaN(caloriesToAdd) || caloriesToAdd <= 0) {
            showNotification('Please add some calories first', 'error');
            return;
        }

        // Get stored token
        const token = localStorage.getItem('token') || getCookie('token');
        if (!token) {
            showNotification('Please login first', 'error');
            return;
        }

        // Show loading state
        const btn = this;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        btn.disabled = true;

        fetch('/api/calories/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    calories: caloriesToAdd
                })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.message || 'Failed to add calories');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    showNotification(`Successfully added ${caloriesToAdd} calories to today's goal`, 'success');
                    // Clear all added foods
                    savedFoods = [];
                    updateSavedFoodsList();
                    updateTotalNutrition();
                    localStorage.removeItem('savedFoods');

                    // Clear detection results if visible
                    if (!imageResultsContainer.classList.contains('hidden')) {
                        detectedFoodsContainer.innerHTML = '';
                        imageCalorieCount.textContent = '0';
                        imageResultsContainer.classList.add('hidden');
                    }
                } else {
                    throw new Error(data.message || 'Failed to add calories');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification(error.message, 'error');
            })
            .finally(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            });
    });

    // Helper function to show notifications
    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, 3000);
    }

    // Helper function to get cookie
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    // Helper function to parse JWT
    function parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error("Error parsing JWT", e);
            return {};
        }
    }

    // Handle manual accept/reject
    document.addEventListener('click', function(e) {
        if (e.target.closest('.manual-accept')) {
            const fullText = document.querySelector('.food-name').textContent;
            const nameMatch = fullText.match(/^(.*?)\s*\(/);
            const foodName = nameMatch ? nameMatch[1].trim() : fullText;

            const quantityMatch = fullText.match(/\((\d+)g\)/);
            const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 100;

            const calories = parseFloat(document.querySelector('#manual-entry-results .calorie-count').textContent);

            const foodItem = {
                name: foodName,
                quantity: quantity,
                calories: calories,
                source: 'manual'
            };

            savedFoods.push(foodItem);
            updateSavedFoodsList();
            updateTotalNutrition();

            // Save to local storage
            localStorage.setItem('savedFoods', JSON.stringify(savedFoods));

            // Hide the manual entry results
            manualResultsContainer.classList.add('hidden');

        } else if (e.target.closest('.manual-reject')) {
            document.getElementById('manual-entry-results').classList.add('hidden');
        }
    });

    // Handle detection accept/reject
    document.addEventListener('click', function(e) {
        if (e.target.closest('.detection-accept')) {
            const btn = e.target.closest('.detection-accept');
            const foodName = btn.getAttribute('data-food');
            const calories = parseFloat(btn.getAttribute('data-calories'));
            const weight = parseFloat(btn.getAttribute('data-weight'));
            const count = parseInt(btn.getAttribute('data-count'));
            const caloriesPer100g = parseFloat(btn.getAttribute('data-calories-per-100g'));

            // Add to saved foods
            const foodItem = {
                name: `${foodName} (${count} ${count > 1 ? 'items' : 'item'})`,
                quantity: weight,
                calories: calories,
                source: 'detection',
                caloriesPer100g: caloriesPer100g
            };

            savedFoods.push(foodItem);
            updateSavedFoodsList();
            updateTotalNutrition();

            // Save to local storage
            localStorage.setItem('savedFoods', JSON.stringify(savedFoods));

            // Remove from detection list
            btn.closest('.food-item').remove();

            // Update the total detected calories
            updateTotalDetectedCalories();

        } else if (e.target.closest('.detection-reject')) {
            const foodItem = e.target.closest('.food-item');
            foodItem.remove();

            // Update the total detected calories
            updateTotalDetectedCalories();
        }
    });

    // Clear saved foods list
    clearListBtn.addEventListener('click', function() {
        if (savedFoods.length > 0 && confirm('Are you sure you want to clear all items?')) {
            savedFoods = [];
            updateSavedFoodsList();
            updateTotalNutrition();
            localStorage.removeItem('savedFoods');
        }
    });

    // Handle network errors with retry functionality
    window.addEventListener('online', function() {
        // Notify user that we're back online
        const notification = document.createElement('div');
        notification.className = 'network-notification online';
        notification.innerHTML = '<i class="fas fa-wifi"></i> You are back online.';
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, 3000);
    });

    window.addEventListener('offline', function() {
        // Notify user that we're offline
        const notification = document.createElement('div');
        notification.className = 'network-notification offline';
        notification.innerHTML = '<i class="fas fa-exclamation-triangle"></i> You are offline. Some features may not work.';
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, 5000);
    });
});