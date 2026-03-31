// Medical Store Management System - Supabase Integration

// ==================== DATA STORE ====================
class DataStore {
    constructor() {
        this.medicines = [];
        this.customers = [];
        this.suppliers = [];
        this.bills = [];
        this.billItems = [];
        this.loaded = false;
    }

    async init() {
        try {
            await Promise.all([
                this.loadMedicines(),
                this.loadCustomers(),
                this.loadSuppliers(),
                this.loadBills()
            ]);
            this.loaded = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize data:', error);
            return false;
        }
    }

    async loadMedicines() {
        const { data, error } = await supabaseClient
            .from('medicines')
            .select('*')
            .order('name');
        if (error) throw error;
        this.medicines = data || [];
    }

    async loadCustomers() {
        const { data, error } = await supabaseClient
            .from('customers')
            .select('*')
            .order('name');
        if (error) throw error;
        this.customers = data || [];
    }

    async loadSuppliers() {
        const { data, error } = await supabaseClient
            .from('suppliers')
            .select('*')
            .order('company');
        if (error) throw error;
        this.suppliers = data || [];
    }

    async loadBills() {
        const { data, error } = await supabaseClient
            .from('bills')
            .select('*, bill_items(*)')
            .order('created_at', { ascending: false })
            .limit(100);
        if (error) throw error;
        this.bills = (data || []).map(bill => ({
            ...bill,
            items: bill.bill_items || [],
            date: bill.created_at,
            invoiceNumber: bill.invoice_number,
            customerId: bill.customer_id,
            discountAmount: bill.discount_amount
        }));
    }

    generateInvoiceNumber() {
        const prefix = 'INV';
        const date = new Date();
        const dateStr = date.getFullYear().toString().substr(-2) + 
                       String(date.getMonth() + 1).padStart(2, '0') + 
                       String(date.getDate()).padStart(2, '0');
        const count = this.bills.length + 1;
        return `${prefix}-${dateStr}-${String(count).padStart(4, '0')}`;
    }
}

const store = new DataStore();

// ==================== NAVIGATION ====================
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');
const pageTitle = document.getElementById('pageTitle');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');

const pageNames = {
    'dashboard': 'Dashboard',
    'inventory': 'Inventory Management',
    'billing': 'Billing',
    'customers': 'Customer Management',
    'suppliers': 'Supplier Management',
    'reports': 'Reports & Analytics'
};

function showPage(pageName) {
    pages.forEach(page => page.classList.remove('active'));
    navItems.forEach(item => item.classList.remove('active'));
    
    document.getElementById(`${pageName}-page`).classList.add('active');
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');
    pageTitle.textContent = pageNames[pageName];
    
    refreshPageData(pageName);
    sidebar.classList.remove('open');
}

function refreshPageData(pageName) {
    switch(pageName) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'inventory':
            renderMedicineTable();
            break;
        case 'billing':
            renderBillItems();
            renderBillsTable();
            populateBillingDropdowns();
            break;
        case 'customers':
            renderCustomerTable();
            break;
        case 'suppliers':
            renderSupplierTable();
            break;
        case 'reports':
            setDefaultDates();
            break;
    }
}

navItems.forEach(item => {
    item.addEventListener('click', () => {
        showPage(item.dataset.page);
    });
});

menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

// ==================== DASHBOARD ====================
function updateDashboard() {
    const today = new Date().toDateString();
    const todaySales = store.bills
        .filter(bill => new Date(bill.date).toDateString() === today)
        .reduce((sum, bill) => sum + parseFloat(bill.total), 0);
    document.getElementById('todaySales').textContent = `₹${todaySales.toLocaleString()}`;
    
    document.getElementById('totalMedicines').textContent = store.medicines.length;
    
    const lowStock = store.medicines.filter(m => m.quantity <= m.min_stock).length;
    document.getElementById('lowStockItems').textContent = lowStock;
    
    document.getElementById('totalCustomers').textContent = store.customers.length;
    
    renderRecentTransactions();
    renderExpiringMedicines();
}

function renderRecentTransactions() {
    const tbody = document.getElementById('recentTransactions');
    const recentBills = store.bills.slice(0, 5);
    
    if (recentBills.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No transactions yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = recentBills.map(bill => {
        const customer = store.customers.find(c => c.id === bill.customer_id);
        const customerName = customer ? customer.name : 'Walk-in Customer';
        return `
            <tr>
                <td>${bill.invoice_number}</td>
                <td>${customerName}</td>
                <td>₹${parseFloat(bill.total).toLocaleString()}</td>
                <td>${new Date(bill.created_at).toLocaleDateString()}</td>
            </tr>
        `;
    }).join('');
}

function renderExpiringMedicines() {
    const tbody = document.getElementById('expiringMedicines');
    const today = new Date();
    const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const expiring = store.medicines.filter(m => {
        const expiry = new Date(m.expiry);
        return expiry <= thirtyDaysLater && expiry >= today;
    }).slice(0, 5);
    
    if (expiring.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="3">No medicines expiring soon</td></tr>';
        return;
    }
    
    tbody.innerHTML = expiring.map(med => `
        <tr>
            <td>${med.name}</td>
            <td>${new Date(med.expiry).toLocaleDateString()}</td>
            <td>${med.quantity}</td>
        </tr>
    `).join('');
}

// ==================== INVENTORY MANAGEMENT ====================
function openMedicineModal(medicineId = null) {
    document.getElementById('medicineModal').classList.add('active');
    document.getElementById('medicineForm').reset();
    document.getElementById('medicineId').value = '';
    
    populateSupplierDropdown();
    
    if (medicineId) {
        const medicine = store.medicines.find(m => m.id === medicineId);
        if (medicine) {
            document.getElementById('medicineModalTitle').textContent = 'Edit Medicine';
            document.getElementById('medicineId').value = medicine.id;
            document.getElementById('medicineName').value = medicine.name;
            document.getElementById('medicineCategory').value = medicine.category;
            document.getElementById('medicineBatch').value = medicine.batch;
            document.getElementById('medicineExpiry').value = medicine.expiry;
            document.getElementById('medicineQuantity').value = medicine.quantity;
            document.getElementById('medicineMinStock').value = medicine.min_stock;
            document.getElementById('medicinePurchasePrice').value = medicine.purchase_price;
            document.getElementById('medicineSellingPrice').value = medicine.selling_price;
            document.getElementById('medicineSupplier').value = medicine.supplier_id || '';
            document.getElementById('medicineManufacturer').value = medicine.manufacturer || '';
            document.getElementById('medicineDescription').value = medicine.description || '';
        }
    } else {
        document.getElementById('medicineModalTitle').textContent = 'Add Medicine';
    }
}

function closeMedicineModal() {
    document.getElementById('medicineModal').classList.remove('active');
}

async function saveMedicine() {
    const form = document.getElementById('medicineForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const medicineId = document.getElementById('medicineId').value;
    const medicineData = {
        name: document.getElementById('medicineName').value,
        category: document.getElementById('medicineCategory').value,
        batch: document.getElementById('medicineBatch').value,
        expiry: document.getElementById('medicineExpiry').value,
        quantity: parseInt(document.getElementById('medicineQuantity').value),
        min_stock: parseInt(document.getElementById('medicineMinStock').value) || 10,
        purchase_price: parseFloat(document.getElementById('medicinePurchasePrice').value),
        selling_price: parseFloat(document.getElementById('medicineSellingPrice').value),
        supplier_id: document.getElementById('medicineSupplier').value || null,
        manufacturer: document.getElementById('medicineManufacturer').value,
        description: document.getElementById('medicineDescription').value
    };
    
    try {
        if (medicineId) {
            const { error } = await supabaseClient
                .from('medicines')
                .update(medicineData)
                .eq('id', medicineId);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient
                .from('medicines')
                .insert(medicineData);
            if (error) throw error;
        }
        
        await store.loadMedicines();
        closeMedicineModal();
        renderMedicineTable();
        updateDashboard();
    } catch (error) {
        alert('Error saving medicine: ' + error.message);
    }
}

async function deleteMedicine(medicineId) {
    if (confirm('Are you sure you want to delete this medicine?')) {
        try {
            const { error } = await supabaseClient
                .from('medicines')
                .delete()
                .eq('id', medicineId);
            if (error) throw error;
            
            await store.loadMedicines();
            renderMedicineTable();
            updateDashboard();
        } catch (error) {
            alert('Error deleting medicine: ' + error.message);
        }
    }
}

function renderMedicineTable() {
    const tbody = document.getElementById('medicineTableBody');
    let medicines = [...store.medicines];
    
    const searchTerm = document.getElementById('medicineSearch').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    const stockFilter = document.getElementById('stockFilter').value;
    
    if (searchTerm) {
        medicines = medicines.filter(m => 
            m.name.toLowerCase().includes(searchTerm) ||
            m.batch.toLowerCase().includes(searchTerm)
        );
    }
    
    if (categoryFilter) {
        medicines = medicines.filter(m => m.category === categoryFilter);
    }
    
    if (stockFilter === 'low') {
        medicines = medicines.filter(m => m.quantity <= m.min_stock && m.quantity > 0);
    } else if (stockFilter === 'out') {
        medicines = medicines.filter(m => m.quantity === 0);
    }
    
    if (medicines.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="8">No medicines found</td></tr>';
        return;
    }
    
    tbody.innerHTML = medicines.map(med => {
        const isLowStock = med.quantity <= med.min_stock;
        const isOutOfStock = med.quantity === 0;
        const isExpiringSoon = new Date(med.expiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        let statusBadge = '';
        if (isOutOfStock) {
            statusBadge = '<span class="badge badge-danger">Out of Stock</span>';
        } else if (isLowStock) {
            statusBadge = '<span class="badge badge-warning">Low Stock</span>';
        }
        
        return `
            <tr>
                <td>
                    ${med.name}
                    ${statusBadge}
                    ${isExpiringSoon ? '<span class="badge badge-warning">Expiring Soon</span>' : ''}
                </td>
                <td>${med.category}</td>
                <td>${med.batch}</td>
                <td>${new Date(med.expiry).toLocaleDateString()}</td>
                <td>${med.quantity}</td>
                <td>₹${med.purchase_price}</td>
                <td>₹${med.selling_price}</td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn edit" onclick="openMedicineModal('${med.id}')" title="Edit">✏️</button>
                        <button class="action-btn delete" onclick="deleteMedicine('${med.id}')" title="Delete">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    populateCategoryFilter();
}

function populateCategoryFilter() {
    const categories = [...new Set(store.medicines.map(m => m.category))];
    const select = document.getElementById('categoryFilter');
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">All Categories</option>' +
        categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    
    select.value = currentValue;
}

function populateSupplierDropdown() {
    const select = document.getElementById('medicineSupplier');
    select.innerHTML = '<option value="">Select Supplier</option>' +
        store.suppliers.map(s => `<option value="${s.id}">${s.company}</option>`).join('');
}

document.getElementById('medicineSearch').addEventListener('input', renderMedicineTable);
document.getElementById('categoryFilter').addEventListener('change', renderMedicineTable);
document.getElementById('stockFilter').addEventListener('change', renderMedicineTable);

// ==================== BILLING ====================
let currentBillItems = [];

function populateBillingDropdowns() {
    const customerSelect = document.getElementById('billCustomer');
    customerSelect.innerHTML = '<option value="">Walk-in Customer</option>' +
        store.customers.map(c => `<option value="${c.id}">${c.name} - ${c.phone}</option>`).join('');
    
    const medicineSelect = document.getElementById('billMedicine');
    medicineSelect.innerHTML = '<option value="">Select Medicine</option>' +
        store.medicines.filter(m => m.quantity > 0).map(m => 
            `<option value="${m.id}">${m.name} (Stock: ${m.quantity}) - ₹${m.selling_price}</option>`
        ).join('');
}

function addToBill() {
    const medicineId = document.getElementById('billMedicine').value;
    const quantity = parseInt(document.getElementById('billQuantity').value);
    
    if (!medicineId) {
        alert('Please select a medicine');
        return;
    }
    
    const medicine = store.medicines.find(m => m.id === medicineId);
    if (!medicine) return;
    
    if (quantity > medicine.quantity) {
        alert(`Only ${medicine.quantity} units available in stock`);
        return;
    }
    
    const existingItem = currentBillItems.find(item => item.medicineId === medicineId);
    if (existingItem) {
        if (existingItem.quantity + quantity > medicine.quantity) {
            alert(`Cannot add more. Only ${medicine.quantity} units available`);
            return;
        }
        existingItem.quantity += quantity;
        existingItem.total = existingItem.quantity * existingItem.price;
    } else {
        currentBillItems.push({
            medicineId: medicineId,
            name: medicine.name,
            quantity: quantity,
            price: medicine.selling_price,
            total: quantity * medicine.selling_price
        });
    }
    
    document.getElementById('billMedicine').value = '';
    document.getElementById('billQuantity').value = 1;
    
    renderBillItems();
    updateBillTotal();
}

function removeFromBill(index) {
    currentBillItems.splice(index, 1);
    renderBillItems();
    updateBillTotal();
}

function renderBillItems() {
    const tbody = document.getElementById('billItemsBody');
    
    if (currentBillItems.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No items added</td></tr>';
        return;
    }
    
    tbody.innerHTML = currentBillItems.map((item, index) => `
        <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>₹${item.price}</td>
            <td>₹${item.total}</td>
            <td>
                <button class="action-btn delete" onclick="removeFromBill(${index})">✕</button>
            </td>
        </tr>
    `).join('');
}

function updateBillTotal() {
    const subtotal = currentBillItems.reduce((sum, item) => sum + item.total, 0);
    const discount = parseFloat(document.getElementById('billDiscount').value) || 0;
    const discountAmount = subtotal * (discount / 100);
    const total = subtotal - discountAmount;
    
    document.getElementById('billSubtotal').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('billTotal').textContent = `₹${total.toFixed(2)}`;
}

function clearBill() {
    currentBillItems = [];
    document.getElementById('billCustomer').value = '';
    document.getElementById('billDiscount').value = 0;
    renderBillItems();
    updateBillTotal();
}

async function generateBill() {
    if (currentBillItems.length === 0) {
        alert('Please add items to the bill');
        return;
    }
    
    const customerId = document.getElementById('billCustomer').value || null;
    const subtotal = currentBillItems.reduce((sum, item) => sum + item.total, 0);
    const discount = parseFloat(document.getElementById('billDiscount').value) || 0;
    const discountAmount = subtotal * (discount / 100);
    const total = subtotal - discountAmount;
    
    try {
        const invoiceNumber = store.generateInvoiceNumber();
        
        const { data: bill, error: billError } = await supabaseClient
            .from('bills')
            .insert({
                invoice_number: invoiceNumber,
                customer_id: customerId,
                subtotal: subtotal,
                discount: discount,
                discount_amount: discountAmount,
                total: total
            })
            .select()
            .single();
        
        if (billError) throw billError;
        
        const billItemsData = currentBillItems.map(item => ({
            bill_id: bill.id,
            medicine_id: item.medicineId,
            medicine_name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.total
        }));
        
        const { error: itemsError } = await supabaseClient
            .from('bill_items')
            .insert(billItemsData);
        
        if (itemsError) throw itemsError;
        
        for (const item of currentBillItems) {
            const medicine = store.medicines.find(m => m.id === item.medicineId);
            if (medicine) {
                const newQuantity = medicine.quantity - item.quantity;
                await supabaseClient
                    .from('medicines')
                    .update({ quantity: newQuantity })
                    .eq('id', item.medicineId);
            }
        }
        
        if (customerId) {
            const customer = store.customers.find(c => c.id === customerId);
            if (customer) {
                const newTotal = (parseFloat(customer.total_purchases) || 0) + total;
                await supabaseClient
                    .from('customers')
                    .update({ total_purchases: newTotal })
                    .eq('id', customerId);
            }
        }
        
        await store.loadMedicines();
        await store.loadCustomers();
        await store.loadBills();
        
        const billForPreview = {
            ...bill,
            items: currentBillItems,
            invoiceNumber: invoiceNumber,
            customerId: customerId,
            discountAmount: discountAmount,
            date: bill.created_at
        };
        
        showBillPreview(billForPreview);
        clearBill();
        renderBillsTable();
        updateDashboard();
    } catch (error) {
        alert('Error generating bill: ' + error.message);
    }
}

function showBillPreview(bill) {
    const customer = store.customers.find(c => c.id === (bill.customer_id || bill.customerId));
    const customerName = customer ? customer.name : 'Walk-in Customer';
    const customerPhone = customer ? customer.phone : '-';
    
    const content = `
        <div class="bill-header">
            <h1>💊 MediStore</h1>
            <p>Your Trusted Medical Store</p>
            <p>Phone: +91 98765 43210</p>
        </div>
        <div class="bill-details">
            <p><strong>Invoice:</strong> ${bill.invoice_number || bill.invoiceNumber}</p>
            <p><strong>Date:</strong> ${new Date(bill.created_at || bill.date).toLocaleString()}</p>
            <p><strong>Customer:</strong> ${customerName}</p>
            <p><strong>Phone:</strong> ${customerPhone}</p>
        </div>
        <table class="bill-items">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${(bill.items || []).map(item => `
                    <tr>
                        <td>${item.medicine_name || item.name}</td>
                        <td>${item.quantity}</td>
                        <td>₹${item.price}</td>
                        <td>₹${item.total}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="bill-total">
            <p>Subtotal: ₹${parseFloat(bill.subtotal).toFixed(2)}</p>
            ${parseFloat(bill.discount) > 0 ? `<p>Discount (${bill.discount}%): -₹${parseFloat(bill.discount_amount).toFixed(2)}</p>` : ''}
            <p><strong>Total: ₹${parseFloat(bill.total).toFixed(2)}</strong></p>
        </div>
        <div class="bill-footer">
            <p>Thank you for your purchase!</p>
            <p>Get well soon!</p>
        </div>
    `;
    
    document.getElementById('billPreviewContent').innerHTML = content;
    document.getElementById('billPreviewModal').classList.add('active');
}

function closeBillPreview() {
    document.getElementById('billPreviewModal').classList.remove('active');
}

function printBill() {
    const content = document.getElementById('billPreviewContent').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Print Bill</title>
            <style>
                body { font-family: 'Courier New', monospace; padding: 20px; }
                .bill-header { text-align: center; margin-bottom: 20px; }
                .bill-header h1 { font-size: 24px; }
                .bill-details { margin-bottom: 16px; }
                .bill-items { width: 100%; border-collapse: collapse; }
                .bill-items th, .bill-items td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                .bill-items th { border-bottom: 2px solid #000; }
                .bill-total { text-align: right; margin-top: 16px; font-size: 18px; }
                .bill-footer { text-align: center; margin-top: 20px; font-size: 12px; }
            </style>
        </head>
        <body>${content}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function renderBillsTable() {
    const tbody = document.getElementById('billsTableBody');
    const bills = store.bills.slice(0, 20);
    
    if (bills.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No bills generated yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = bills.map(bill => {
        const customer = store.customers.find(c => c.id === bill.customer_id);
        const customerName = customer ? customer.name : 'Walk-in';
        return `
            <tr>
                <td>${bill.invoice_number}</td>
                <td>${customerName}</td>
                <td>${bill.items ? bill.items.length : 0}</td>
                <td>₹${parseFloat(bill.total).toLocaleString()}</td>
                <td>${new Date(bill.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="action-btn view" onclick="viewBill('${bill.id}')" title="View">👁️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function viewBill(billId) {
    const bill = store.bills.find(b => b.id === billId);
    if (bill) {
        showBillPreview(bill);
    }
}

// ==================== CUSTOMER MANAGEMENT ====================
function openCustomerModal(customerId = null) {
    document.getElementById('customerModal').classList.add('active');
    document.getElementById('customerForm').reset();
    document.getElementById('customerId').value = '';
    
    if (customerId) {
        const customer = store.customers.find(c => c.id === customerId);
        if (customer) {
            document.getElementById('customerModalTitle').textContent = 'Edit Customer';
            document.getElementById('customerId').value = customer.id;
            document.getElementById('customerName').value = customer.name;
            document.getElementById('customerPhone').value = customer.phone;
            document.getElementById('customerEmail').value = customer.email || '';
            document.getElementById('customerDob').value = customer.dob || '';
            document.getElementById('customerAddress').value = customer.address || '';
            document.getElementById('customerNotes').value = customer.notes || '';
        }
    } else {
        document.getElementById('customerModalTitle').textContent = 'Add Customer';
    }
}

function closeCustomerModal() {
    document.getElementById('customerModal').classList.remove('active');
}

async function saveCustomer() {
    const form = document.getElementById('customerForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const customerId = document.getElementById('customerId').value;
    const customerData = {
        name: document.getElementById('customerName').value,
        phone: document.getElementById('customerPhone').value,
        email: document.getElementById('customerEmail').value || null,
        dob: document.getElementById('customerDob').value || null,
        address: document.getElementById('customerAddress').value || null,
        notes: document.getElementById('customerNotes').value || null
    };
    
    try {
        if (customerId) {
            const { error } = await supabaseClient
                .from('customers')
                .update(customerData)
                .eq('id', customerId);
            if (error) throw error;
        } else {
            customerData.total_purchases = 0;
            const { error } = await supabaseClient
                .from('customers')
                .insert(customerData);
            if (error) throw error;
        }
        
        await store.loadCustomers();
        closeCustomerModal();
        renderCustomerTable();
        updateDashboard();
    } catch (error) {
        alert('Error saving customer: ' + error.message);
    }
}

async function deleteCustomer(customerId) {
    if (confirm('Are you sure you want to delete this customer?')) {
        try {
            const { error } = await supabaseClient
                .from('customers')
                .delete()
                .eq('id', customerId);
            if (error) throw error;
            
            await store.loadCustomers();
            renderCustomerTable();
            updateDashboard();
        } catch (error) {
            alert('Error deleting customer: ' + error.message);
        }
    }
}

function renderCustomerTable() {
    const tbody = document.getElementById('customerTableBody');
    let customers = [...store.customers];
    
    const searchTerm = document.getElementById('customerSearch').value.toLowerCase();
    if (searchTerm) {
        customers = customers.filter(c => 
            c.name.toLowerCase().includes(searchTerm) ||
            c.phone.includes(searchTerm) ||
            (c.email && c.email.toLowerCase().includes(searchTerm))
        );
    }
    
    if (customers.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No customers found</td></tr>';
        return;
    }
    
    tbody.innerHTML = customers.map(cust => `
        <tr>
            <td>${cust.name}</td>
            <td>${cust.phone}</td>
            <td>${cust.email || '-'}</td>
            <td>${cust.address || '-'}</td>
            <td>₹${(parseFloat(cust.total_purchases) || 0).toLocaleString()}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="openCustomerModal('${cust.id}')" title="Edit">✏️</button>
                    <button class="action-btn delete" onclick="deleteCustomer('${cust.id}')" title="Delete">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

document.getElementById('customerSearch').addEventListener('input', renderCustomerTable);

// ==================== SUPPLIER MANAGEMENT ====================
function openSupplierModal(supplierId = null) {
    document.getElementById('supplierModal').classList.add('active');
    document.getElementById('supplierForm').reset();
    document.getElementById('supplierId').value = '';
    
    if (supplierId) {
        const supplier = store.suppliers.find(s => s.id === supplierId);
        if (supplier) {
            document.getElementById('supplierModalTitle').textContent = 'Edit Supplier';
            document.getElementById('supplierId').value = supplier.id;
            document.getElementById('supplierCompany').value = supplier.company;
            document.getElementById('supplierContact').value = supplier.contact;
            document.getElementById('supplierPhone').value = supplier.phone;
            document.getElementById('supplierEmail').value = supplier.email || '';
            document.getElementById('supplierAddress').value = supplier.address || '';
            document.getElementById('supplierGst').value = supplier.gst || '';
            document.getElementById('supplierLicense').value = supplier.license || '';
        }
    } else {
        document.getElementById('supplierModalTitle').textContent = 'Add Supplier';
    }
}

function closeSupplierModal() {
    document.getElementById('supplierModal').classList.remove('active');
}

async function saveSupplier() {
    const form = document.getElementById('supplierForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const supplierId = document.getElementById('supplierId').value;
    const supplierData = {
        company: document.getElementById('supplierCompany').value,
        contact: document.getElementById('supplierContact').value,
        phone: document.getElementById('supplierPhone').value,
        email: document.getElementById('supplierEmail').value || null,
        address: document.getElementById('supplierAddress').value || null,
        gst: document.getElementById('supplierGst').value || null,
        license: document.getElementById('supplierLicense').value || null
    };
    
    try {
        if (supplierId) {
            const { error } = await supabaseClient
                .from('suppliers')
                .update(supplierData)
                .eq('id', supplierId);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient
                .from('suppliers')
                .insert(supplierData);
            if (error) throw error;
        }
        
        await store.loadSuppliers();
        closeSupplierModal();
        renderSupplierTable();
    } catch (error) {
        alert('Error saving supplier: ' + error.message);
    }
}

async function deleteSupplier(supplierId) {
    if (confirm('Are you sure you want to delete this supplier?')) {
        try {
            const { error } = await supabaseClient
                .from('suppliers')
                .delete()
                .eq('id', supplierId);
            if (error) throw error;
            
            await store.loadSuppliers();
            renderSupplierTable();
        } catch (error) {
            alert('Error deleting supplier: ' + error.message);
        }
    }
}

function renderSupplierTable() {
    const tbody = document.getElementById('supplierTableBody');
    let suppliers = [...store.suppliers];
    
    const searchTerm = document.getElementById('supplierSearch').value.toLowerCase();
    if (searchTerm) {
        suppliers = suppliers.filter(s => 
            s.company.toLowerCase().includes(searchTerm) ||
            s.contact.toLowerCase().includes(searchTerm) ||
            s.phone.includes(searchTerm)
        );
    }
    
    if (suppliers.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No suppliers found</td></tr>';
        return;
    }
    
    tbody.innerHTML = suppliers.map(sup => `
        <tr>
            <td>${sup.company}</td>
            <td>${sup.contact}</td>
            <td>${sup.phone}</td>
            <td>${sup.email || '-'}</td>
            <td>${sup.address || '-'}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="openSupplierModal('${sup.id}')" title="Edit">✏️</button>
                    <button class="action-btn delete" onclick="deleteSupplier('${sup.id}')" title="Delete">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

document.getElementById('supplierSearch').addEventListener('input', renderSupplierTable);

// ==================== REPORTS ====================
function setDefaultDates() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    document.getElementById('salesStartDate').value = thirtyDaysAgo.toISOString().split('T')[0];
    document.getElementById('salesEndDate').value = today.toISOString().split('T')[0];
}

async function generateSalesReport() {
    const startDate = document.getElementById('salesStartDate').value;
    const endDate = document.getElementById('salesEndDate').value;
    
    try {
        const { data: bills, error } = await supabaseClient
            .from('bills')
            .select('*, bill_items(*)')
            .gte('created_at', startDate)
            .lte('created_at', endDate + 'T23:59:59')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const totalSales = bills.reduce((sum, bill) => sum + parseFloat(bill.total), 0);
        const totalBills = bills.length;
        const avgBill = totalBills > 0 ? totalSales / totalBills : 0;
        
        document.getElementById('reportTotalSales').textContent = `₹${totalSales.toLocaleString()}`;
        document.getElementById('reportTotalBills').textContent = totalBills;
        document.getElementById('reportAvgBill').textContent = `₹${avgBill.toFixed(2)}`;
        
        const tbody = document.getElementById('salesReportBody');
        if (bills.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No sales in selected date range</td></tr>';
            return;
        }
        
        tbody.innerHTML = bills.map(bill => {
            const customer = store.customers.find(c => c.id === bill.customer_id);
            const customerName = customer ? customer.name : 'Walk-in';
            return `
                <tr>
                    <td>${new Date(bill.created_at).toLocaleDateString()}</td>
                    <td>${bill.invoice_number}</td>
                    <td>${customerName}</td>
                    <td>${bill.bill_items ? bill.bill_items.length : 0}</td>
                    <td>₹${parseFloat(bill.total).toLocaleString()}</td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        alert('Error generating report: ' + error.message);
    }
}

function generateInventoryReport() {
    const totalItems = store.medicines.length;
    const lowStock = store.medicines.filter(m => m.quantity <= m.min_stock).length;
    const today = new Date();
    const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiring = store.medicines.filter(m => new Date(m.expiry) <= thirtyDaysLater).length;
    const stockValue = store.medicines.reduce((sum, m) => sum + (m.quantity * parseFloat(m.purchase_price)), 0);
    
    document.getElementById('invReportTotal').textContent = totalItems;
    document.getElementById('invReportLowStock').textContent = lowStock;
    document.getElementById('invReportExpiring').textContent = expiring;
    document.getElementById('invReportValue').textContent = `₹${stockValue.toLocaleString()}`;
    
    const tbody = document.getElementById('inventoryReportBody');
    if (store.medicines.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No medicines in inventory</td></tr>';
        return;
    }
    
    tbody.innerHTML = store.medicines.map(med => {
        const isLowStock = med.quantity <= med.min_stock;
        const isOutOfStock = med.quantity === 0;
        const isExpiring = new Date(med.expiry) <= thirtyDaysLater;
        
        let status = '<span class="badge badge-success">In Stock</span>';
        if (isOutOfStock) {
            status = '<span class="badge badge-danger">Out of Stock</span>';
        } else if (isLowStock) {
            status = '<span class="badge badge-warning">Low Stock</span>';
        }
        if (isExpiring) {
            status += ' <span class="badge badge-warning">Expiring</span>';
        }
        
        const stockValue = med.quantity * parseFloat(med.purchase_price);
        
        return `
            <tr>
                <td>${med.name}</td>
                <td>${med.category}</td>
                <td>${med.quantity}</td>
                <td>₹${stockValue.toLocaleString()}</td>
                <td>${status}</td>
            </tr>
        `;
    }).join('');
}

// ==================== GLOBAL SEARCH ====================
document.getElementById('globalSearch').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const searchTerm = this.value.toLowerCase().trim();
        if (searchTerm) {
            showPage('inventory');
            document.getElementById('medicineSearch').value = searchTerm;
            renderMedicineTable();
        }
    }
});

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async function() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });
    
    // Initialize data from Supabase
    const success = await store.init();
    if (success) {
        updateDashboard();
    } else {
        alert('Failed to connect to database. Please check your Supabase configuration in config.js');
    }
});
