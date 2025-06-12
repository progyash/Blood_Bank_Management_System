// script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const API_BASE_URL = 'http://localhost:3000/api'; // MAKE SURE THIS IS CORRECT
    const TOAST_TIMEOUT = 3500; // Milliseconds for toast visibility

    // --- Global Data Storage ---
    window.bloodTypes = [];
    window.hospitals = [];
    window.donors = [];
    window.recipients = [];
    window.donorTransactions = [];
    window.recipientTransactions = [];

    // --- DOM Elements ---
    const bodyElement = document.body;
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const sidebarToggleButton = document.getElementById('sidebar-toggle');
    const themeToggleButton = document.getElementById('theme-toggle');
    const toastContainer = document.getElementById('toast-container');

    // === Theme Toggle Logic ===
    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = (theme) => {
        bodyElement.classList.remove('light-mode', 'dark-mode');
        bodyElement.classList.add(theme + '-mode');
        // console.log(`Theme applied: ${theme}`); // Uncomment for debugging
    };

    const toggleTheme = () => {
        const currentTheme = bodyElement.classList.contains('dark-mode') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    };

    // Load initial theme
    const savedTheme = localStorage.getItem('theme');
    let initialTheme = savedTheme || (prefersDarkScheme.matches ? 'dark' : 'light');
    applyTheme(initialTheme);

    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', toggleTheme);
    }

    // === Sidebar Toggle Logic ===
    const applySidebarState = (collapsed) => {
        bodyElement.classList.toggle('sidebar-collapsed', collapsed);
        if (sidebarToggleButton) {
            sidebarToggleButton.title = collapsed ? "Expand Sidebar" : "Collapse Sidebar";
            sidebarToggleButton.setAttribute('aria-expanded', String(!collapsed));
        }
    };

    const toggleSidebar = () => {
        const isCollapsed = bodyElement.classList.contains('sidebar-collapsed');
        localStorage.setItem('sidebarCollapsed', String(!isCollapsed));
        applySidebarState(!isCollapsed);
    };

    // Load initial sidebar state
    const savedSidebarState = localStorage.getItem('sidebarCollapsed') === 'true';
    applySidebarState(savedSidebarState);
    if (sidebarToggleButton) {
        sidebarToggleButton.setAttribute('aria-expanded', String(!savedSidebarState));
    }

    if (sidebarToggleButton) {
        sidebarToggleButton.addEventListener('click', toggleSidebar);
    }

    // === Toast Notification System ===
    const showToast = (message, type = 'info') => {
        if (!toastContainer) {
            console.warn("Toast container not found. Falling back to alert.");
            alert(`[${type.toUpperCase()}] ${message}`);
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.setAttribute('role', 'alert');

        toastContainer.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        const timerId = setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => {
                if (toast.parentNode === toastContainer) {
                    toastContainer.removeChild(toast);
                }
            }, { once: true });
        }, TOAST_TIMEOUT);

        toast.addEventListener('click', () => {
             clearTimeout(timerId);
             toast.classList.remove('show');
             toast.addEventListener('transitionend', () => {
                 if (toast.parentNode === toastContainer) {
                     toastContainer.removeChild(toast);
                 }
            }, { once: true });
        }, { once: true });
    };

    // --- Utility Functions ---
    async function fetchData(endpoint) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`);
            if (!response.ok) {
                let errorMsg = `HTTP Error: ${response.status} ${response.statusText}`;
                let responseBody = {};
                try {
                    responseBody = await response.json();
                    errorMsg = responseBody.message || errorMsg;
                } catch (e) { /* Ignore if response is not JSON */ }
                throw new Error(errorMsg);
            }
            return await response.json();
        } catch (error) {
            console.error(`Fetch Error (${endpoint}):`, error);
            showToast(`Error fetching data: ${error.message || 'Network error or server unavailable.'}`, 'error');
            return null;
        }
    }

    const showSection = (targetId) => {
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active-section');
        });
        document.querySelectorAll('.sidebar-nav a').forEach(link => link.classList.remove('active'));
        hideAllFormsExcept(null);

        const targetSection = document.getElementById(targetId);
        const targetLink = document.querySelector(`.sidebar-nav a[data-target="${targetId}"]`);

        if (targetSection) {
            setTimeout(() => targetSection.classList.add('active-section'), 50);
        } else {
            console.warn(`Target section "${targetId}" not found.`);
        }
        if (targetLink) {
            targetLink.classList.add('active');
        } else {
             console.warn(`Target link for section "${targetId}" not found.`);
        }

        if (mainContent) {
            mainContent.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const showForm = (formId) => {
        const form = document.getElementById(formId);
        if (form) {
            hideAllFormsExcept(formId);
            form.reset();

            const hiddenIdInput = form.querySelector('input[type="hidden"]');
            if (hiddenIdInput) hiddenIdInput.value = '';

            const idInput = form.querySelector('input[type="text"][id$="-id"]:not([type="hidden"])'); // Target only the visible ID input
            if (idInput) {
                idInput.readOnly = false;
                idInput.style.backgroundColor = '';
                idInput.style.opacity = '';
                idInput.style.cursor = '';
                idInput.style.borderStyle = '';
            }

            form.classList.remove('hidden');

             const headerHeight = document.querySelector('.sidebar-header')?.clientHeight || 70;
             const formTop = form.getBoundingClientRect().top + window.scrollY;
             const scrollToY = Math.max(0, formTop - headerHeight - 20);
             window.scrollTo({ top: scrollToY, behavior: 'smooth' });

            // Populate dropdowns relevant to the specific form being shown
            console.log(`[DEBUG] Showing form: ${formId}. Populating relevant dropdowns.`);
            if (formId === 'donor-form' || formId === 'recipient-form' || formId === 'recipient-trans-form') {
                populateBloodTypeDropdowns();
            }
            // *** Correctly populate Hospital dropdown for transaction forms ***
            if (formId === 'donor-trans-form' || formId === 'recipient-trans-form') {
                console.log(`[DEBUG Hospital Dropdown] Calling populateHospitalDropdowns for form ${formId}.`);
                populateHospitalDropdowns(); // <--- THIS IS THE CALL WE ARE DEBUGGING
            }
            if (formId === 'donor-trans-form') {
                populateDonorDropdowns();
            }
            if (formId === 'recipient-trans-form') {
                populateRecipientDropdowns();
                // Blood type dropdown is already handled above for this form
            }
        } else {
            console.error(`Form with ID "${formId}" not found.`);
        }
    };

    const hideForm = (formId) => {
        const form = document.getElementById(formId);
        if (form && !form.classList.contains('hidden')) {
            form.classList.add('hidden');
            form.reset();
            const idInput = form.querySelector('input[id$="-id"][readonly]');
            if (idInput) {
                idInput.readOnly = false;
                idInput.style.backgroundColor = '';
                idInput.style.opacity = '';
                idInput.style.cursor = '';
                idInput.style.borderStyle = '';
            }
        }
    };

    const hideAllFormsExcept = (keepFormId) => {
        document.querySelectorAll('.data-form').forEach(form => {
            if (form.id !== keepFormId) {
                hideForm(form.id);
            }
        });
    };

    // --- Helper Functions (Data Lookups for Rendering) ---
    const getBloodTypeName = (id) => window.bloodTypes.find(bt => bt.Blood_Type_ID === id)?.Name || 'N/A';
    const getHospitalName = (id) => window.hospitals.find(h => h.Hospital_ID === id)?.Name || 'N/A';
    const getDonorName = (id) => window.donors.find(d => d.Donor_ID === id)?.Name || 'N/A';
    const getRecipientName = (id) => window.recipients.find(r => r.Recipient_ID === id)?.Name || 'N/A';

    // --- Data Loading Functions (Fetch and Store) ---
    async function loadBloodTypes() {
        const data = await fetchData('/blood-types');
        if (data !== null) {
            window.bloodTypes = data; // Assumes API sorts by ID
            renderBloodTypes();
            // populateBloodTypeDropdowns(); // Called when needed by showForm/setupEditForm
            updateDashboardStats();
        }
    }

    async function loadHospitals() {
        const data = await fetchData('/hospitals');
        if (data !== null) {
            window.hospitals = data; // Assumes API sorts by ID
            console.log('[DEBUG Hospital Dropdown] window.hospitals loaded:', JSON.parse(JSON.stringify(window.hospitals))); // Log loaded data
            renderHospitals();
            // populateHospitalDropdowns(); // Called when needed by showForm/setupEditForm
            updateDashboardStats();
        }
    }

    async function loadDonors() {
        const data = await fetchData('/donors');
        if (data !== null) {
            window.donors = data; // Assumes API sorts by ID
            renderDonors();
            // populateDonorDropdowns(); // Called when needed by showForm/setupEditForm
            updateDashboardStats();
        }
    }

    async function loadRecipients() {
        const data = await fetchData('/recipients');
        if (data !== null) {
            window.recipients = data; // Assumes API sorts by ID
            renderRecipients();
            // populateRecipientDropdowns(); // Called when needed by showForm/setupEditForm
            updateDashboardStats();
        }
    }

    async function loadDonorTransactions() {
        const data = await fetchData('/donor-transactions');
        if (data !== null) {
             window.donorTransactions = data; // Assumes API sorts by Date DESC
            renderDonorTransactions();
        }
    }

    async function loadRecipientTransactions() {
        const data = await fetchData('/recipient-transactions');
        if (data !== null) {
             window.recipientTransactions = data; // Assumes API sorts by Date DESC
            renderRecipientTransactions();
        }
    }

    // --- Rendering Functions (Populate Tables) ---
     const renderTableRows = (tableId, data, columns, actions) => {
        const tableBody = document.getElementById(tableId)?.querySelector('tbody');
        if (!tableBody) {
            console.error(`Table body not found for ID: ${tableId}`); return;
        }
        tableBody.innerHTML = '';

        if (!data || data.length === 0) {
            const colSpan = columns.length + (actions ? 1 : 0);
            tableBody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center text-muted py-4">No data available.</td></tr>`;
            return;
        }

        data.forEach(item => {
            const row = tableBody.insertRow();
            const primaryIdKey = columns[0].key;
             row.dataset.id = item[primaryIdKey];

            columns.forEach(col => {
                const cell = row.insertCell();
                let value = col.render ? col.render(item) : item[col.key];
                 if (col.isDate && value) {
                     try {
                          const date = new Date(value + 'T00:00:00Z'); // Treat date string as UTC to avoid timezone offset issues
                          if (!isNaN(date)) {
                             value = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
                          } else { value = item[col.key]; }
                     } catch (e) { console.warn("Could not format date:", value); value = item[col.key]; }
                 }
                cell.textContent = value ?? 'N/A';

                if (col.maxLength) {
                    cell.style.maxWidth = `${col.maxLength}px`;
                    cell.style.whiteSpace = 'normal';
                    cell.style.wordBreak = 'break-word';
                    cell.style.verticalAlign = 'top';
                }
            });

            if (actions) {
                const cellActions = row.insertCell();
                cellActions.classList.add('action-cell');

                if (actions.edit) {
                    const editBtn = document.createElement('button');
                    editBtn.type = 'button'; editBtn.className = 'btn btn-edit btn-small';
                    editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i><span class="sr-only">Edit</span>';
                    editBtn.title = `Edit ${item[primaryIdKey]}`;
                    editBtn.onclick = (e) => { e.stopPropagation(); actions.edit(item[primaryIdKey]); };
                    cellActions.appendChild(editBtn);
                }
                if (actions.delete) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.type = 'button'; deleteBtn.className = 'btn btn-delete btn-small';
                    deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i><span class="sr-only">Delete</span>';
                    deleteBtn.title = `Delete ${item[primaryIdKey]}`;
                    deleteBtn.onclick = (e) => { e.stopPropagation(); actions.delete(item[primaryIdKey]); };
                    cellActions.appendChild(deleteBtn);
                }
            }
        });
    };

    // Specific render function calls
     const renderBloodTypes = () => renderTableRows('blood-type-table', window.bloodTypes,
        [{ key: 'Blood_Type_ID', label: 'ID' }, { key: 'Name', label: 'Name' }],
        { edit: window.editBloodType, delete: window.deleteBloodType }
    );
    const renderHospitals = () => renderTableRows('hospital-table', window.hospitals,
        [ { key: 'Hospital_ID', label: 'ID' }, { key: 'Name', label: 'Name' }, { key: 'Address', label: 'Address' }, { key: 'Contact_Number', label: 'Contact' } ],
        { edit: window.editHospital, delete: window.deleteHospital }
    );
    const renderDonors = () => renderTableRows('donor-table', window.donors,
        [ { key: 'Donor_ID', label: 'ID' }, { key: 'Name', label: 'Name' }, { key: 'Contact_Number', label: 'Contact' }, { key: 'Age', label: 'Age' }, { key: 'Blood_Type_ID', label: 'Blood Type', render: item => getBloodTypeName(item.Blood_Type_ID) }, { key: 'Donor_Card_ID', label: 'Card ID' } ],
        { edit: window.editDonor, delete: window.deleteDonor }
    );
    const renderRecipients = () => renderTableRows('recipient-table', window.recipients,
        [ { key: 'Recipient_ID', label: 'ID' }, { key: 'Name', label: 'Name' }, { key: 'Contact_Number', label: 'Contact' }, { key: 'Blood_Type_ID', label: 'Blood Type', render: item => getBloodTypeName(item.Blood_Type_ID) }, { key: 'Donor_ID', label: 'Directed Donor' } ],
        { edit: window.editRecipient, delete: window.deleteRecipient }
    );
    const renderDonorTransactions = () => renderTableRows('donor-trans-table', window.donorTransactions,
        [ { key: 'Donor_Trans_ID', label: 'Trans ID' }, { key: 'Donor_ID', label: 'Donor', render: item => getDonorName(item.Donor_ID) }, { key: 'Hospital_ID', label: 'Hospital', render: item => getHospitalName(item.Hospital_ID) }, { key: 'Date', label: 'Date', isDate: true }, { key: 'Donation_Confirmation', label: 'Confirmation' }, { key: 'Health_Condition', label: 'Health' } ],
        { edit: window.editDonorTransaction, delete: window.deleteDonorTransaction }
    );
    const renderRecipientTransactions = () => renderTableRows('recipient-trans-table', window.recipientTransactions,
        [ { key: 'Recipient_Trans_ID', label: 'Trans ID' }, { key: 'Recipient_ID', label: 'Recipient', render: item => getRecipientName(item.Recipient_ID) }, { key: 'Hospital_ID', label: 'Hospital', render: item => getHospitalName(item.Hospital_ID) }, { key: 'Blood_Type_ID', label: 'Blood Type', render: item => getBloodTypeName(item.Blood_Type_ID) }, { key: 'Date', label: 'Date', isDate: true }, { key: 'Recipient_Request', label: 'Request/Notes', maxLength: 200 }, { key: 'Donor_Card_ID', label: 'Donor Card' } ],
        { edit: window.editRecipientTransaction, delete: window.deleteRecipientTransaction }
    );

    // --- Dropdown Population Functions ---
    const populateDropdown = (selector, data, valueField, textField, defaultOptionText) => {
        // *** DEBUGGING ADDED HERE ***
        const isHospitalDropdown = selector.includes('hospital'); // Check if it's the hospital dropdown we're populating
        if (isHospitalDropdown) {
            console.log(`[DEBUG Hospital Dropdown] populateDropdown called for selector: ${selector}`);
            console.log(`[DEBUG Hospital Dropdown] Using data source:`, data ? JSON.parse(JSON.stringify(data)) : 'null/undefined'); // Deep copy for logging
            console.log(`[DEBUG Hospital Dropdown] Value field: ${valueField}, Text field: ${textField}`);
        }
        // *** END DEBUGGING ***

        const selects = document.querySelectorAll(selector);
        selects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = `<option value="">-- ${defaultOptionText} --</option>`; // Set default placeholder

            if (data && data.length > 0) {
                data.forEach((item, index) => {
                    // *** DEBUGGING ADDED HERE ***
                    if (isHospitalDropdown && index < 5) { // Log first few items only
                         console.log(`[DEBUG Hospital Dropdown] Processing item ${index}:`, item);
                         console.log(`[DEBUG Hospital Dropdown] --> Value (${valueField}): ${item[valueField]}, Text (${textField}): ${item[textField]}`);
                    }
                    // *** END DEBUGGING ***

                    const option = document.createElement('option');
                    option.value = item[valueField];
                    // Display as "ID) Name" for clarity
                    option.textContent = `${item[valueField]}) ${item[textField]}`;
                    select.appendChild(option);
                });
            } else if (isHospitalDropdown) {
                 console.warn(`[DEBUG Hospital Dropdown] No data provided for selector ${selector}`);
            }

            // Restore selection if editing and value exists
            if (currentValue && Array.from(select.options).some(opt => opt.value === currentValue)) {
                select.value = currentValue;
            }
        });
    };

    // Specific dropdown population function calls
    const populateBloodTypeDropdowns = () => populateDropdown('select[id*="blood-type"]', window.bloodTypes, 'Blood_Type_ID', 'Name', 'Select Blood Type');
    const populateDonorDropdowns = () => populateDropdown('select[id*="-donor"]', window.donors, 'Donor_ID', 'Name', 'Select Donor'); // Adjusted selector slightly
    const populateRecipientDropdowns = () => populateDropdown('select[id*="-recipient"]', window.recipients, 'Recipient_ID', 'Name', 'Select Recipient'); // Adjusted selector slightly
    // *** This is the correct function declaration ***
    const populateHospitalDropdowns = () => populateDropdown('select[id*="hospital"]', window.hospitals, 'Hospital_ID', 'Name', 'Select Hospital');

    // --- Dashboard Update ---
     const updateDashboardStats = () => {
        document.getElementById('total-donors').textContent = window.donors.length;
        document.getElementById('total-recipients').textContent = window.recipients.length;
        document.getElementById('total-hospitals').textContent = window.hospitals.length;
        document.getElementById('total-blood-types').textContent = window.bloodTypes.length;
    };

    // --- Form Handling (Submit Logic) ---
     const handleFormSubmit = async (e, formId, endpoint, loadDataFunction, requiredFieldsCheck, entityName) => {
        e.preventDefault();
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        if (!submitButton) return;
        const originalButtonHTML = submitButton.innerHTML;

        submitButton.disabled = true;
        submitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;

        const hiddenIdInput = form.querySelector('input[type="hidden"]');
        const editId = hiddenIdInput?.value || null;

        const formData = new FormData(form);
        let data = {};
         // Map form fields to data object, trimming strings and handling nulls/numbers
         if (formId === 'blood-type-form') { data = { Blood_Type_ID: formData.get('blood-type-id')?.trim(), Name: formData.get('blood-type-name')?.trim() }; }
         else if (formId === 'hospital-form') { data = { Hospital_ID: formData.get('hospital-id')?.trim(), Name: formData.get('hospital-name')?.trim(), Address: formData.get('hospital-address')?.trim() || null, Contact_Number: formData.get('hospital-contact')?.trim() }; }
         else if (formId === 'donor-form') { data = { Donor_ID: formData.get('donor-id')?.trim(), Name: formData.get('donor-name')?.trim(), Contact_Number: formData.get('donor-contact')?.trim(), Age: parseInt(formData.get('donor-age'), 10), Blood_Type_ID: formData.get('donor-blood-type'), Donor_Card_ID: formData.get('donor-card-id')?.trim() || null }; }
         else if (formId === 'recipient-form') { data = { Recipient_ID: formData.get('recipient-id')?.trim(), Name: formData.get('recipient-name')?.trim(), Contact_Number: formData.get('recipient-contact')?.trim(), Blood_Type_ID: formData.get('recipient-blood-type'), Donor_ID: formData.get('recipient-donor-id')?.trim() || null }; }
         else if (formId === 'donor-trans-form') { data = { Donor_Trans_ID: formData.get('donor-trans-id')?.trim(), Donor_ID: formData.get('donor-trans-donor'), Hospital_ID: formData.get('donor-trans-hospital'), Date: formData.get('donor-trans-date'), Donation_Confirmation: formData.get('donor-trans-confirmation')?.trim() || null, Health_Condition: formData.get('donor-trans-health')?.trim() || null }; }
         else if (formId === 'recipient-trans-form') { data = { Recipient_Trans_ID: formData.get('recipient-trans-id')?.trim(), Recipient_ID: formData.get('recipient-trans-recipient'), Hospital_ID: formData.get('recipient-trans-hospital'), Blood_Type_ID: formData.get('recipient-trans-blood-type'), Date: formData.get('recipient-trans-date'), Recipient_Request: formData.get('recipient-trans-request')?.trim() || null, Donor_Card_ID: formData.get('recipient-trans-donor-card')?.trim() || null }; }

        if (requiredFieldsCheck && !requiredFieldsCheck(data)) {
            submitButton.disabled = false; submitButton.innerHTML = originalButtonHTML;
            return; // Validation fails, toast shown by validation function
        }

        let url = `${API_BASE_URL}${endpoint}`;
        let method = 'POST';
        if (editId) { url += `/${editId}`; method = 'PUT'; }

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || `Request failed: ${response.status}`);

            showToast(result.message || `${entityName} ${editId ? 'updated' : 'created'}!`, 'success');
            hideForm(formId);
            await loadDataFunction(); // Reload data for the section

            // Force refresh relevant dropdowns after add/update - RELOAD THE DATA SOURCE
             if (entityName === 'BloodType') await loadBloodTypes();
             else if (entityName === 'Hospital') await loadHospitals();
             else if (entityName === 'Donor') await loadDonors();
             else if (entityName === 'Recipient') await loadRecipients();

            if (['Donor', 'Recipient', 'Hospital', 'BloodType'].includes(entityName)) {
                updateDashboardStats();
            }
        } catch (error) {
            console.error(`Error saving ${entityName.toLowerCase()}:`, error);
            showToast(`Error: ${error.message || 'Could not save data.'}`, 'error');
        } finally {
            submitButton.disabled = false; submitButton.innerHTML = originalButtonHTML;
        }
    };

    // --- Edit Functions (Prepare Form for Editing) ---
     const setupEditForm = (id, dataArray, formId, fieldsToPopulate) => {
        const item = dataArray.find(d => d[fieldsToPopulate.idField] === id);
        if (!item) { showToast(`Error: Item ${id} not found for editing.`, 'error'); return; }

        showForm(formId); // Show form, which also triggers dropdown population
        const form = document.getElementById(formId);
        if (!form) return;

        const hiddenInput = form.querySelector('input[type="hidden"]');
        if (hiddenInput) hiddenInput.value = id;

        fieldsToPopulate.fields.forEach(field => {
            const input = form.querySelector(`#${field.inputId}`);
            if (input) {
                if (input.type === 'date' && item[field.dataKey]) {
                    try { input.value = item[field.dataKey].split('T')[0]; } // Format YYYY-MM-DD
                    catch (e) { input.value = ''; }
                } else {
                    input.value = item[field.dataKey] ?? ''; // Use nullish coalescing
                }
            } else { console.warn(`Input #${field.inputId} not found in form ${formId}.`); }
        });

        // Delay setting select values slightly to ensure options are populated by showForm
        setTimeout(() => {
            fieldsToPopulate.fields.forEach(field => {
                const input = form.querySelector(`#${field.inputId}`);
                if (input && input.tagName === 'SELECT') {
                    const valueToSelect = String(item[field.dataKey] ?? '');
                    if (Array.from(input.options).some(opt => opt.value === valueToSelect)) {
                        input.value = valueToSelect;
                    } else {
                        if (valueToSelect !== '') console.warn(`Value "${valueToSelect}" not found in select options for #${field.inputId}. Setting to default.`);
                        input.value = ''; // Set to default placeholder
                    }
                }
            });

            // Make the primary ID field read-only after populating
            const idInput = form.querySelector(`#${fieldsToPopulate.idInputId}`);
            if (idInput && idInput.type === 'text') {
                idInput.value = id; // Ensure ID is displayed
                idInput.readOnly = true;
                idInput.style.backgroundColor = 'var(--input-bg-color)'; // Or a specific readonly style bg
                idInput.style.opacity = '0.7';
                idInput.style.cursor = 'not-allowed';
                idInput.style.borderStyle = 'dashed';
            }
        }, 150); // Adjust delay if needed
    };

    // Define window functions for edit actions
    window.editBloodType = (id) => setupEditForm(id, window.bloodTypes, 'blood-type-form', { idField: 'Blood_Type_ID', idInputId: 'blood-type-id', fields: [{ inputId: 'blood-type-name', dataKey: 'Name' }] });
    window.editHospital = (id) => setupEditForm(id, window.hospitals, 'hospital-form', { idField: 'Hospital_ID', idInputId: 'hospital-id', fields: [{ inputId: 'hospital-name', dataKey: 'Name' }, { inputId: 'hospital-address', dataKey: 'Address' }, { inputId: 'hospital-contact', dataKey: 'Contact_Number' }] });
    window.editDonor = (id) => setupEditForm(id, window.donors, 'donor-form', { idField: 'Donor_ID', idInputId: 'donor-id', fields: [{ inputId: 'donor-name', dataKey: 'Name' }, { inputId: 'donor-contact', dataKey: 'Contact_Number' }, { inputId: 'donor-age', dataKey: 'Age' }, { inputId: 'donor-blood-type', dataKey: 'Blood_Type_ID' }, { inputId: 'donor-card-id', dataKey: 'Donor_Card_ID' }] });
    window.editRecipient = (id) => setupEditForm(id, window.recipients, 'recipient-form', { idField: 'Recipient_ID', idInputId: 'recipient-id', fields: [{ inputId: 'recipient-name', dataKey: 'Name' }, { inputId: 'recipient-contact', dataKey: 'Contact_Number' }, { inputId: 'recipient-blood-type', dataKey: 'Blood_Type_ID' }, { inputId: 'recipient-donor-id', dataKey: 'Donor_ID' }] });
    window.editDonorTransaction = (id) => setupEditForm(id, window.donorTransactions, 'donor-trans-form', { idField: 'Donor_Trans_ID', idInputId: 'donor-trans-id', fields: [{ inputId: 'donor-trans-donor', dataKey: 'Donor_ID' }, { inputId: 'donor-trans-hospital', dataKey: 'Hospital_ID' }, { inputId: 'donor-trans-date', dataKey: 'Date' }, { inputId: 'donor-trans-confirmation', dataKey: 'Donation_Confirmation' }, { inputId: 'donor-trans-health', dataKey: 'Health_Condition' }] });
    window.editRecipientTransaction = (id) => setupEditForm(id, window.recipientTransactions, 'recipient-trans-form', { idField: 'Recipient_Trans_ID', idInputId: 'recipient-trans-id', fields: [{ inputId: 'recipient-trans-recipient', dataKey: 'Recipient_ID' }, { inputId: 'recipient-trans-hospital', dataKey: 'Hospital_ID' }, { inputId: 'recipient-trans-blood-type', dataKey: 'Blood_Type_ID' }, { inputId: 'recipient-trans-date', dataKey: 'Date' }, { inputId: 'recipient-trans-request', dataKey: 'Recipient_Request' }, { inputId: 'recipient-trans-donor-card', dataKey: 'Donor_Card_ID' }] });

    // --- Delete Functions (Handle Delete Button Clicks) ---
     const handleDelete = async (id, endpoint, loadDataFunction, entityName) => {
        if (!confirm(`DELETE ${entityName.toUpperCase()} ${id}?\n\nThis action cannot be undone.`)) return;

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}/${id}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || `Failed to delete: ${response.status}`);

            showToast(result.message || `${entityName} ${id} deleted.`, 'success');
            await loadDataFunction();
            hideAllFormsExcept(null);

            // Force refresh relevant dropdowns after delete - RELOAD THE DATA SOURCE
             if (entityName === 'BloodType') await loadBloodTypes();
             else if (entityName === 'Hospital') await loadHospitals();
             else if (entityName === 'Donor') await loadDonors();
             else if (entityName === 'Recipient') await loadRecipients();

            if (['Donor', 'Recipient', 'Hospital', 'BloodType'].includes(entityName)) {
                updateDashboardStats();
            }
        } catch (error) {
            console.error(`Error deleting ${entityName.toLowerCase()} ${id}:`, error);
             if (error.message && (error.message.toLowerCase().includes('foreign key constraint') || error.message.toLowerCase().includes('referenced'))) {
                 showToast(`Cannot delete ${entityName} ${id} as it's referenced by other records. Remove references first.`, 'error');
            } else {
                showToast(`Error deleting ${entityName}: ${error.message || 'Unknown error.'}`, 'error');
            }
        }
    };

    // Define window functions for delete actions
    window.deleteBloodType = (id) => handleDelete(id, '/blood-types', loadBloodTypes, 'Blood Type');
    window.deleteHospital = (id) => handleDelete(id, '/hospitals', loadHospitals, 'Hospital');
    window.deleteDonor = (id) => handleDelete(id, '/donors', loadDonors, 'Donor');
    window.deleteRecipient = (id) => handleDelete(id, '/recipients', loadRecipients, 'Recipient');
    window.deleteDonorTransaction = (id) => handleDelete(id, '/donor-transactions', loadDonorTransactions, 'Donor Transaction');
    window.deleteRecipientTransaction = (id) => handleDelete(id, '/recipient-transactions', loadRecipientTransactions, 'Recipient Transaction');

    // --- Form Validation Helpers ---
    const validateRequired = (value, fieldName) => {
        if (value === null || value === undefined || String(value).trim() === '') {
            showToast(`${fieldName} is required.`, 'warning'); return false;
        } return true;
    };
    const validateAge = (age, fieldName = 'Age') => {
        const ageNum = parseInt(age, 10);
        if (isNaN(ageNum)) { showToast(`${fieldName} must be a valid number.`, 'warning'); return false; }
        if (ageNum < 18) { showToast(`Donor ${fieldName} must be 18 or older.`, 'warning'); return false; }
        if (ageNum > 120) { showToast(`Please enter a realistic ${fieldName}.`, 'warning'); return false; }
        return true;
    };
    const validateDateFormat = (dateStr, fieldName = 'Date') => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
             showToast(`${fieldName} must be in YYYY-MM-DD format.`, 'warning'); return false;
        } return true;
    }

    // Define specific validation check functions for each form type
    const validateBloodTypeForm = (data) => validateRequired(data.Blood_Type_ID, 'Blood Type ID') && validateRequired(data.Name, 'Name');
    const validateHospitalForm = (data) => validateRequired(data.Hospital_ID, 'Hospital ID') && validateRequired(data.Name, 'Name') && validateRequired(data.Contact_Number, 'Contact Number');
    const validateDonorForm = (data) => validateRequired(data.Donor_ID, 'Donor ID') && validateRequired(data.Name, 'Name') && validateRequired(data.Contact_Number, 'Contact Number') && validateRequired(data.Blood_Type_ID, 'Blood Type') && validateRequired(data.Age, 'Age') && validateAge(data.Age);
    const validateRecipientForm = (data) => validateRequired(data.Recipient_ID, 'Recipient ID') && validateRequired(data.Name, 'Name') && validateRequired(data.Contact_Number, 'Contact Number') && validateRequired(data.Blood_Type_ID, 'Required Blood Type');
    const validateDonorTransForm = (data) => validateRequired(data.Donor_Trans_ID, 'Transaction ID') && validateRequired(data.Donor_ID, 'Donor') && validateRequired(data.Hospital_ID, 'Hospital') && validateRequired(data.Date, 'Donation Date') && validateDateFormat(data.Date, 'Donation Date');
    const validateRecipientTransForm = (data) => validateRequired(data.Recipient_Trans_ID, 'Transaction ID') && validateRequired(data.Recipient_ID, 'Recipient') && validateRequired(data.Hospital_ID, 'Hospital') && validateRequired(data.Blood_Type_ID, 'Blood Type Received') && validateRequired(data.Date, 'Transaction Date') && validateDateFormat(data.Date, 'Transaction Date');

    // --- Form Submit Event Listeners ---
    document.getElementById('blood-type-form')?.addEventListener('submit', (e) => handleFormSubmit(e, 'blood-type-form', '/blood-types', loadBloodTypes, validateBloodTypeForm, 'BloodType'));
    document.getElementById('hospital-form')?.addEventListener('submit', (e) => handleFormSubmit(e, 'hospital-form', '/hospitals', loadHospitals, validateHospitalForm, 'Hospital'));
    document.getElementById('donor-form')?.addEventListener('submit', (e) => handleFormSubmit(e, 'donor-form', '/donors', loadDonors, validateDonorForm, 'Donor'));
    document.getElementById('recipient-form')?.addEventListener('submit', (e) => handleFormSubmit(e, 'recipient-form', '/recipients', loadRecipients, validateRecipientForm, 'Recipient'));
    document.getElementById('donor-trans-form')?.addEventListener('submit', (e) => handleFormSubmit(e, 'donor-trans-form', '/donor-transactions', loadDonorTransactions, validateDonorTransForm, 'DonorTransaction'));
    document.getElementById('recipient-trans-form')?.addEventListener('submit', (e) => handleFormSubmit(e, 'recipient-trans-form', '/recipient-transactions', loadRecipientTransactions, validateRecipientTransForm, 'RecipientTransaction'));

    // --- Other Event Listeners Setup ---
    // Sidebar navigation
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            if (targetId && !link.classList.contains('active')) {
                 showSection(targetId);
            }
        });
    });

    // "Add New" buttons (Event Delegation)
    mainContent.addEventListener('click', (e) => {
        const targetButton = e.target.closest('.btn-add');
        if (!targetButton) return;
        const targetId = targetButton.id;
        let formIdToShow = null;
        if (targetId === 'add-blood-type-btn') formIdToShow = 'blood-type-form';
        else if (targetId === 'add-hospital-btn') formIdToShow = 'hospital-form';
        else if (targetId === 'add-donor-btn') formIdToShow = 'donor-form';
        else if (targetId === 'add-recipient-btn') formIdToShow = 'recipient-form';
        else if (targetId === 'add-donor-trans-btn') formIdToShow = 'donor-trans-form';
        else if (targetId === 'add-recipient-trans-btn') formIdToShow = 'recipient-trans-form';
        if (formIdToShow) showForm(formIdToShow);
    });

    // "Cancel" buttons (Event Delegation)
    mainContent.addEventListener('click', (e) => {
         const targetButton = e.target.closest('.btn-secondary');
         if (!targetButton || !targetButton.id.startsWith('cancel-')) return;
         const formType = targetButton.id.replace('cancel-', '').replace('-btn', '');
         const formIdToHide = `${formType}-form`;
         hideForm(formIdToHide);
    });

    // --- Application Initialization ---
    const initializeApp = async () => {
        console.log("Initializing Blood Bank App...");
        showToast("Loading data...", "info");
        try {
            // Load data concurrently where possible
            await Promise.all([
                loadBloodTypes(),
                loadHospitals(),
                loadDonors(),
                loadRecipients(),
                loadDonorTransactions(),
                loadRecipientTransactions()
            ]);

            console.log("All data loaded.");
            updateDashboardStats();
            showSection('dashboard-section'); // Start on dashboard
            console.log("Application initialized successfully.");
            // Optional: showToast("Application ready.", "success");

        } catch (err) {
             console.error("FATAL: App Initialization Error:", err);
             showToast("Critical error loading application data. Check console.", 'error');
             mainContent.innerHTML = `<div class='critical-error card'>
                <h2><i class="fas fa-exclamation-triangle section-icon"></i> Initialization Failed</h2>
                <p>Could not load essential application data. Ensure the backend server at <strong>${API_BASE_URL}</strong> is running and the database is accessible.</p>
                <p>Check the browser console (F12) for detailed errors.</p>
             </div>`;
        }
    };

    initializeApp();

}); // End DOMContentLoaded