// Configuration constants
// Defines the number of products to display per page for pagination
const PRODUCTS_PER_PAGE = 9;
// Base URL for API requests, typically the server address
const API_BASE = "http://localhost:3000";
// API endpoints for authentication-related actions
const LOGIN_ENDPOINT = "/api/auth/login";
const REGISTER_ENDPOINT = "/api/auth/register";
const SIGNOUT_ENDPOINT = "/api/auth/signout";
const PROFILE_ENDPOINT = "/api/auth/profile";
// Redirect paths after specific actions or authentication checks
const REDIRECT_AFTER_LOGIN = "/home.html";
const REDIRECT_IF_AUTHENTICATED = "/home.html";
const REDIRECT_IF_NOT_AUTHENTICATED = "public.html";

// State variables
// Stores all products fetched from the API
let allProducts = [];
// Stores filtered products based on category selection
let filteredProducts = [];
// Tracks the current page for pagination
let currentPage = 0;
// Tracks the currently selected category filter (e.g., 'all', 'CPU')
let currentCategory = 'all';

// Load all products from API
// Fetches products from multiple endpoints and organizes them by category
async function loadAllProducts() {
  // Array of API endpoints for different product categories
  const endpoints = [
    { url: '/api/CPUs', category: 'CPU' },
    { url: '/api/GPUs', category: 'GPU' },
    { url: '/api/RAM', category: 'RAM' },
    { url: '/api/Storage', category: 'Storage' },
  ];

  // Fetch all products concurrently using Promise.all for efficiency
  const results = await Promise.all(
    endpoints.map(async ({ url, category }) => {
      // Make a GET request to the endpoint
      const res = await fetch(url);
      // Parse the JSON response
      const data = await res.json();
      // Add category to each product item for filtering later
      return data.map(item => ({ ...item, category }));
    })
  );

  // Flatten the array of product arrays into a single array
  allProducts = results.flat();
  // Initialize filtered products as all products (no filter applied initially)
  filteredProducts = allProducts;
  // Render the products to the DOM
  renderProducts();
}

// Render products to the DOM
// Displays a paginated list of products in the UI
function renderProducts() {
  // Get the container element for the product list
  const productList = document.getElementById('product-list');
  // Clear existing content to avoid duplicates
  productList.innerHTML = '';

  // Calculate the start and end indices for the current page
  const start = currentPage * PRODUCTS_PER_PAGE;
  const end = start + PRODUCTS_PER_PAGE;
  // Slice the filtered products array to get products for the current page
  const productsToShow = filteredProducts.slice(start, end);

  // Iterate over the products to display
  productsToShow.forEach(product => {
    // Create a div for each product card
    const div = document.createElement('div');
    div.className = 'col mb-5'; // Bootstrap classes for grid layout

    // Check if user is authenticated to show admin controls (edit/delete)
    const token = localStorage.getItem('token');
    const adminControls = token
      ? `
        <div class="mt-2">
          <a href="edit.html?id=${product._id}&cat=${product.category}" class="btn btn-warning btn-sm me-2">Edit</a>
          <button class="btn btn-danger btn-sm delete-btn" data-id="${product._id}" data-cat="${product.category}">Delete</button>
        </div>
      `
      : ''; // Empty string if user is not authenticated

    // Set the HTML content for the product card
    div.innerHTML = `
      <div class="card h-100">
        <img class="card-img-top" src="${product.image}" alt="${product.name}" />
        <div class="card-body p-4">
          <div class="text-center">
            <h5 class="fw-bolder">${product.name}</h5>
            <p class="text-primary fw-bold">$${product.price?.toFixed(2) || 'N/A'}</p>
            <a href="detail.html?id=${product._id}&cat=${product.category}" class="btn btn-outline-primary">Details</a>
            ${adminControls}
          </div>
        </div>
      </div>
    `;

    // Append the product card to the product list container
    productList.appendChild(div);
  });

  // Show or hide the "Load More" button based on whether there are more products
  document.getElementById('load-more').style.display =
    end >= filteredProducts.length ? 'none' : 'inline-block';
}

// Handle user logout
// Clears authentication data and redirects to the public page
function logout() {
  // Remove authentication token and username from localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  // Notify user of successful logout
  alert('You have been logged out.');
  // Redirect to the public page
  window.location.href = 'public.html';
}

// Initial page setup
// Configures the UI based on authentication status when the page loads
document.addEventListener('DOMContentLoaded', () => {
  // Get references to logout and login links in the navigation
  const logoutLink = document.getElementById('logout-link');
  const loginLink = document.getElementById('login-link');
  // Retrieve authentication token and username from localStorage
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');

  // Check if user is authenticated
  if (token && username) {
    // Show logout link for authenticated users
    logoutLink.style.display = 'inline';
    // Update login link to display welcome message with username
    loginLink.textContent = `Welcome, ${username}`;
    loginLink.href = '#'; // Disable navigation on welcome link
    // Attach logout handler to the logout link
    logoutLink.addEventListener('click', logout);
    // Create a "Create New Product" button for admins
    const createBtn = document.createElement('a');
    createBtn.href = 'create.html';
    createBtn.className = 'btn btn-success mb-3';
    createBtn.textContent = 'Create New Product';
    // Prepend the button to the main container
    const container = document.querySelector('.container');
    if (container) {
      container.prepend(createBtn);
    }
    // Load all products for authenticated users
    loadAllProducts();
  } else {
    // Hide logout link for unauthenticated users
    logoutLink.style.display = 'none';
    // Set login link to direct to sign-in page
    loginLink.textContent = 'Login';
    loginLink.href = '/auth/signin.html';
    // Redirect to public page if not on public.html and not authenticated
    if (!window.location.pathname.endsWith('/public.html')) {
      window.location.href = 'public.html';
    } else {
      // Load products for public page
      loadAllProducts();
    }
  }
});

// Load more products on button click
// Increments the page number and renders the next set of products
document.getElementById('load-more')?.addEventListener('click', () => {
  // Increment the current page
  currentPage++;
  // Render the next set of products
  renderProducts();
});

// Handle product deletion
// Deletes a product via API when the delete button is clicked
document.addEventListener('click', async (e) => {
  // Check if the clicked element is a delete button
  if (e.target.classList.contains('delete-btn')) {
    // Get product ID and category from data attributes
    const id = e.target.dataset.id;
    const cat = e.target.dataset.cat;

    // Map category names to API collection names
    const collectionMap = {
      CPU: 'CPUs',
      GPU: 'GPUs',
      RAM: 'RAM',
      Storage: 'Storage'
    };
    const realCat = collectionMap[cat] || cat;

    // Confirm deletion with the user
    const confirmDelete = confirm("Are you sure you want to delete this product?");
    if (!confirmDelete) return;

    try {
      // Get authentication token
      const token = localStorage.getItem('token');
      // Send DELETE request to the API
      const res = await fetch(`/api/${realCat}/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Check if deletion was successful
      if (res.ok) {
        alert('Product deleted!');
        // Reload all products to update the UI
        loadAllProducts();
      } else {
        alert('Failed to delete product.');
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert('Error deleting product.');
    }
  }
});

// Category filter functionality
// Filters products by category when a category button is clicked
document.querySelectorAll('.category-filter').forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault(); // Prevent default link behavior
    // Get the selected category from the button's data attribute
    currentCategory = btn.dataset.category;
    // Filter products based on the selected category
    filteredProducts = currentCategory === 'all'
      ? allProducts
      : allProducts.filter(p => p.category === currentCategory);
    // Reset to the first page
    currentPage = 0;
    // Render the filtered products
    renderProducts();
  });
});

// Home page specific logic
// Configures the home page UI based on authentication status
if (window.location.pathname.endsWith('/home.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    // Get authentication token and username
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const loginLink = document.getElementById('login-link');
    const logoutLink = document.getElementById('logout-link');

    // Check if user is authenticated
    if (token) {
      // Update login link with welcome message
      if (loginLink) {
        loginLink.textContent = username ? `Welcome, ${username}` : "Welcome!";
        loginLink.href = "#";
      }
      // Show logout link and attach logout handler
      if (logoutLink) {
        logoutLink.style.display = 'inline';
        logoutLink.addEventListener('click', () => {
          localStorage.removeItem('token');
          localStorage.removeItem('username');
          window.location.href = '/auth/signin.html';
        });
      }
    } else {
      // Hide logout link and set login link for unauthenticated users
      if (logoutLink) logoutLink.style.display = 'none';
      if (loginLink) {
        loginLink.textContent = 'Login';
        loginLink.href = '/auth/signin.html';
      }
    }
  });
}

// Create product page logic
// Handles the submission of the product creation form
if (window.location.pathname.endsWith('/create.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    // Attach submit event listener to the product form
    document.getElementById("product-form").addEventListener("submit", async function (e) {
      e.preventDefault(); // Prevent default form submission

      // Get authentication token
      const token = localStorage.getItem("token");
      // Get form input values
      const name = document.getElementById("product-name").value;
      const category = document.getElementById("product-category").value;

      // Map category to API collection name
      const collectionMap = {
        CPU: 'CPUs',
        GPU: 'GPUs',
        RAM: 'RAM',
        Storage: 'Storage'
      };
      const realCat = collectionMap[category] || category;

      const price = parseFloat(document.getElementById("product-price").value);
      const image = document.getElementById("product-image").value;
      const description = document.getElementById("product-description").value;

      // Create product object
      const product = { name, price, image, description };

      try {
        // Send POST request to create the product
        const res = await fetch(`/api/${realCat}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(product)
        });

        // Check if creation was successful
        if (res.ok) {
          alert("Product created!");
          window.location.href = "home.html";
        } else {
          alert("Failed to create product.");
        }
      } catch (err) {
        console.error("Create failed:", err);
        alert("Error creating product.");
      }
    });
  });
}

// Edit product page logic
// Loads and updates product details for editing
if (window.location.pathname.endsWith('/edit.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    // Get product ID and category from URL parameters
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const catParam = params.get('cat');

    // Map category to API collection name
    const collectionMap = {
      CPU: 'CPUs',
      GPU: 'GPUs',
      RAM: 'RAM',
      Storage: 'Storage'
    };
    const category = collectionMap[catParam];

    // Get authentication token
    const token = localStorage.getItem('token');

    // Validate required data
    if (!id || !category || !token) {
      alert('Missing data or not logged in.');
      window.location.href = 'public.html';
      return;
    }

    // Load product details from API
    async function loadProduct() {
      try {
        // Fetch product data using axios
        const res = await axios.get(`/api/${category}/${id}`);
        const product = res.data;

        // Populate form fields with product data
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-image').value = product.image;
        document.getElementById('product-description').value = product.description;
      } catch (err) {
        console.error('Failed to load product:', err);
        alert('Product not found.');
        window.location.href = 'home.html';
      }
    }

    // Handle form submission to update product
    document.getElementById('edit-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      try {
        // Create updated product object from form inputs
        const updatedProduct = {
          name: document.getElementById('product-name').value,
          price: parseFloat(document.getElementById('product-price').value),
          image: document.getElementById('product-image').value,
          description: document.getElementById('product-description').value
        };

        // Send PUT request to update the product
        await axios.put(`/api/${category}/${id}`, updatedProduct, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        alert('Product updated!');
        window.location.href = 'home.html';
      } catch (err) {
        console.error('Update failed:', err);
        alert('Failed to update product.');
      }
    });

    // Load product data when the page loads
    loadProduct();
  });
}

// Public page logic
// Configures the public page UI and loads products
if (window.location.pathname.endsWith('/public.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    // Get navigation links and authentication data
    const logoutLink = document.getElementById('logout-link');
    const loginLink = document.getElementById('login-link');
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');

    // Check if user is authenticated
    if (token && username) {
      // Show logout link and update login link with welcome message
      logoutLink.style.display = 'inline';
      loginLink.textContent = `Welcome, ${username}`;
      loginLink.href = '#';
      logoutLink.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        window.location.href = 'public.html';
      });
    } else {
      // Hide logout link and set login link for unauthenticated users
      logoutLink.style.display = 'none';
      loginLink.textContent = 'Login';
      loginLink.href = '/auth/signin.html';
    }

    // Load all products for the public page
    loadAllProducts();
  });
}

// Product detail page logic
// Displays detailed information about a specific product
if (window.location.pathname.endsWith('/detail.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    // Get product ID and category from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("id");
    const category = urlParams.get("cat");

    // Get the container for product details
    const detailContainer = document.getElementById("product-detail");

    // Validate URL parameters
    if (!productId || !category) {
      detailContainer.innerHTML = "<p class='text-danger'>Invalid product request.</p>";
      return;
    }

    // Map category to API collection name
    const collectionMap = {
      CPU: 'CPUs',
      GPU: 'GPUs',
      RAM: 'RAM',
      Storage: 'Storage'
    };

    const collection = collectionMap[category];
    if (!collection) {
      detailContainer.innerHTML = "<p class='text-danger'>Invalid product category.</p>";
      return;
    }

    // Fetch product details from the API
    fetch(`/api/${collection}/${productId}`)
      .then(res => res.json())
      .then(product => {
        // Render product details in the UI
        detailContainer.innerHTML = `
          <div class="row">
            <div class="col-lg-4">
              <img src="${product.image}" class="img-fluid" alt="${product.name}">
            </div>
            <div class="col-lg-4">
              <h2>${product.name}</h2>
              <h4 class="text-muted">${category}</h4>
              <p class="lead">$${product.price.toFixed(2)}</p>
              <p>Description: ${product.description}</p>
              <button id="add-to-cart" class="btn btn-success mt-3">Add to Cart</button>
            </div>
          </div>
        `;

        // Handle "Add to Cart" button click
        document.getElementById("add-to-cart").addEventListener("click", () => {
          // Get existing cart from localStorage or initialize an empty array
          const cart = JSON.parse(localStorage.getItem("cart")) || [];
          // Add product to cart
          cart.push(product);
          // Save updated cart to localStorage
          localStorage.setItem("cart", JSON.stringify(cart));
          alert("Product added to cart!");
        });
      })
      .catch(() => {
        // Display error message if product fetch fails
        detailContainer.innerHTML = "<p class='text-danger'>Error loading product details (404).</p>";
      });
  });
}