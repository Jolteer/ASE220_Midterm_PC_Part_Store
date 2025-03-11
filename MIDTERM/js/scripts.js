$(document).ready(function () {
    const productsPerPage = 5;
    let currentPage = 1;
    let allProducts = [];
    let filteredProducts = [];

    // Fetch product data from JSONBlob
    function fetchProducts() {
        $.ajax({
            url: "https://jsonblob.com/api/jsonBlob/1349041342118027264",
            method: "GET",
            dataType: "json",
            success: function (data) {
                // Add category labels to products
                allProducts = [
                    ...data.CPUs.map(p => ({ ...p, category: "CPUs" })),
                    ...data.GPUs.map(p => ({ ...p, category: "GPUs" })),
                    ...data.RAM.map(p => ({ ...p, category: "RAM" })),
                    ...data.Hard_Disks.map(p => ({ ...p, category: "Hard_Disks" }))
                ];
                filteredProducts = allProducts; // Default to all products
                displayProducts();
                setupPagination();
            },
            error: function (error) {
                console.error("Error fetching products:", error);
            }
        });
    }

    // Display products for the current page
    function displayProducts() {
        let start = (currentPage - 1) * productsPerPage;
        let end = start + productsPerPage;
        let paginatedItems = filteredProducts.slice(start, end);

        $("#product-list").empty();
        $.each(paginatedItems, function (index, product) {
            $("#product-list").append(createProductCard(product, index));
        });

        setupPagination();
    }

    // Create product cards dynamically
    function createProductCard(product, index) {
        return `
            <div class="col mb-5" id="product-${index}">
                <div class="card h-100">
                    <img class="card-img-top" src="${product.image}" alt="${product.name}" />
                    <div class="card-body p-4 text-center">
                        <h5 class="fw-bolder">${product.name}</h5>
                        <p class="text-muted">${product.category}</p>
                        <p>$${product.price.toFixed(2)}</p>
                    </div>
                    <div class="card-footer p-4 pt-0 border-top-0 bg-transparent text-center">
                        <a class="btn btn-outline-dark mt-auto" href="detail.html?id=${product.id}">View Product</a>
                        <button class="btn btn-primary mt-auto edit-btn" data-index="${index}">Edit</button>
                        <button class="btn btn-danger mt-auto delete-btn" data-index="${index}">Delete</button>
                    </div>
                </div>
            </div>
        `;
    }

    // Setup pagination controls
    function setupPagination() {
        let totalPages = Math.ceil(filteredProducts.length / productsPerPage);
        $("#pagination").html(`
            <button class="btn btn-dark change-page" data-direction="-1" ${currentPage === 1 ? "disabled" : ""}>Previous</button>
            <span class="mx-3">Page ${currentPage} of ${totalPages}</span>
            <button class="btn btn-dark change-page" data-direction="1" ${currentPage === totalPages ? "disabled" : ""}>Next</button>
        `);
    }

    // Handle pagination clicks
    $(document).on("click", ".change-page", function () {
        let direction = parseInt($(this).data("direction"));
        currentPage += direction;
        displayProducts();
    });

    // Handle category filtering
    $(document).on("click", ".category-filter", function (e) {
        e.preventDefault();
        let selectedCategory = $(this).data("category");

        if (selectedCategory === "all") {
            filteredProducts = allProducts;
        } else {
            filteredProducts = allProducts.filter(product => product.category === selectedCategory);
        }

        currentPage = 1; // Reset to first page when filtering
        displayProducts();
    });

    // Open edit modal
    function openEditModal(index) {
        let product = filteredProducts[index];
        let modal = `
            <div class="modal fade show" id="editModal" tabindex="-1" style="display: block;" aria-modal="true" role="dialog">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Edit Product</h5>
                            <button type="button" class="btn-close close-modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <label>Name:</label>
                            <input type="text" id="editName" class="form-control" value="${product.name}" />
                            <label>Category:</label>
                            <input type="text" id="editCategory" class="form-control" value="${product.category}" />
                            <label>Price:</label>
                            <input type="number" id="editPrice" class="form-control" value="${product.price}" />
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary close-modal">Cancel</button>
                            <button type="button" class="btn btn-primary save-changes" data-index="${index}">Save</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        $("body").append(modal);
    }

    // Close modal function
    function closeModal() {
        $("#editModal").remove();
    }

    // Save edited product details
    $(document).on("click", ".save-changes", function () {
        let index = $(this).data("index");
        filteredProducts[index].name = $("#editName").val();
        filteredProducts[index].category = $("#editCategory").val();
        filteredProducts[index].price = parseFloat($("#editPrice").val());

        displayProducts();
        closeModal();
    });

    // Handle delete product
    $(document).on("click", ".delete-btn", function () {
        let index = $(this).data("index");
        if (confirm("Are you sure you want to delete this product?")) {
            filteredProducts.splice(index, 1);
            displayProducts();
            setupPagination();
        }
    });

    // Event listener for edit buttons
    $(document).on("click", ".edit-btn", function () {
        let index = $(this).data("index");
        openEditModal(index);
    });

    // Event listener for closing modal
    $(document).on("click", ".close-modal", function () {
        closeModal();
    });

    // Initialize
    fetchProducts();
});
