// This is api of the google Sheet,  we get this api in the AppsScript which connects the client side with the Google sheets
// In this project we have performed CRUD operations using google sheet which like our database 
// Similarly we have also used sheetdb.io to perform operations like GET, PATCH and DELETE.
const urlParams = new URLSearchParams(window.location.search);
const id = urlParams.get('id');
const clientName = urlParams.get('name');
let amount = urlParams.get('amount');
let totalAmount = amount;
let filteredAmount = 0;
let transactionTBody = document.getElementById('transactionTBody');
let allTransactions = []; // Store all transactions globally
let sheetdbApi = "https://sheetdb.io/api/v1/1t4s2tpynnj6p"; // this api is of hiteshbhandarihb98@gmail.com
// let sheetdbApi = "https://sheetdb.io/api/v1/1i8f5j7jt2dkj"; // this api is of hiteshkumarjainhkj@gmail.com
const sheetdbApis = [
    "https://sheetdb.io/api/v1/1t4s2tpynnj6p",
    "https://sheetdb.io/api/v1/1i8f5j7jt2dkj"
]
let currentApiIndex = 0;

document.getElementById('detailsHeading').textContent = clientName;

document.addEventListener('deviceready', function () {
    console.log("Cordova is ready.");
    // Now you can safely use Cordova APIs
}, false);

// PDF download functionality
document.getElementById('downloadPdfBtn').addEventListener('click', function () {
    // Reset scroll to top before generating PDF
    window.scrollTo(0, 0);

    // Short delay to ensure scroll reset and DOM stabilization
    setTimeout(() => {
        generatePDF();
    }, 100);
});

function requestAndCheckPermissions() {
    return new Promise((resolve, reject) => {
        if (typeof cordova === 'undefined' || !cordova.plugins || !cordova.plugins.permissions) {
            console.log("Cordova permissions plugin not available");
            reject("Permissions plugin not available");
            return;
        }

        const permissions = cordova.plugins.permissions;

        // First, check and request WRITE_EXTERNAL_STORAGE
        permissions.checkPermission(permissions.WRITE_EXTERNAL_STORAGE, function (status) {
            if (status.hasPermission) {
                // Already has write permission, now check read permission
                checkReadPermission();
            } else {
                // Request write permission
                permissions.requestPermission(permissions.WRITE_EXTERNAL_STORAGE, function (status) {
                    if (status.hasPermission) {
                        // Got write permission, now check read permission
                        checkReadPermission();
                    } else {
                        console.log("Write permission denied");
                        showToast("Storage write permission required for PDF download", "error");
                        reject("Write permission denied");
                    }
                }, function (error) {
                    console.log("Error requesting write permission:", error);
                    reject(error);
                });
            }
        }, function (error) {
            console.log("Error checking write permission:", error);
            reject(error);
        });

        // Function to check and request read permission
        function checkReadPermission() {
            permissions.checkPermission(permissions.READ_EXTERNAL_STORAGE, function (status) {
                if (status.hasPermission) {
                    // Has both permissions
                    resolve(true);
                } else {
                    // Request read permission
                    permissions.requestPermission(permissions.READ_EXTERNAL_STORAGE, function (status) {
                        if (status.hasPermission) {
                            resolve(true);
                        } else {
                            console.log("Read permission denied");
                            showToast("Storage read permission required for PDF download", "error");
                            reject("Read permission denied");
                        }
                    }, function (error) {
                        console.log("Error requesting read permission:", error);
                        reject(error);
                    });
                }
            }, function (error) {
                console.log("Error checking read permission:", error);
                reject(error);
            });
        }
    });
}

// Function to generate PDF that works in both (cordova & web) environments
function generatePDF() {
    console.log("Cordova detected:", typeof cordova !== 'undefined');
    console.log("File plugin available:", typeof window.resolveLocalFileSystemURL !== 'undefined');
    if (window.cordova) {
        console.log("Running in Cordova!");
    }
    // Get the client name for the filename
    const clientName = document.getElementById('detailsHeading').textContent;

    // Format date for filename
    let date = new Date()
    let hours = String(date.getHours()).padStart(2, '0')
    let minutes = String(date.getMinutes()).padStart(2, '0')
    let downloadDate = String(date.getDate()).padStart(2, '0') + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        date.getFullYear()

    const filename = `${clientName}_Transactions_${downloadDate}_${hours}-${minutes}.pdf`;

    // Create a new element for PDF content
    const printContent = document.createElement('div');
    printContent.innerHTML = `
        <style>
            body { font-family: 'Fira Sans', sans-serif; padding: 20px; }
            .pdf-header { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #4A9DB7; }
            .pdf-footer { text-align: right; font-size: 12px; color: #777; margin-top: 20px; }
            .pdf-content table { width: 100%; border-collapse: collapse; }
            .pdf-content th, .pdf-content td {
                border: 1px solid #ddd;
                padding: 10px;
                text-align: left;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .pdf-content th {
                background-color: #72D57A;
                color: white;
            }
        </style>
        <div class="pdf-header">${clientName} Ledger Statement</div>
        ${document.getElementById('transactionsTable').outerHTML}
        <div class="pdf-footer">Generated on ${downloadDate} ${hours}:${minutes}</div>
    `;

    // PDF generation options
    const opt = {
        margin: 10,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Check if we're in a Cordova environment
    const isCordova = typeof cordova !== 'undefined';
    console.log("Running in Cordova environment:", isCordova);
    if (isCordova) {
        // Cordova-specific PDF generation
        // cordova.plugins.permissions.requestPermission(
        //     cordova.plugins.permissions.WRITE_EXTERNAL_STORAGE,
        //     function (status) {
        // if (status.hasPermission) {
        // Request permissions then proceed with PDF generation
        requestAndCheckPermissions()
            .then(() => {
                showToast("Creating PDF...", "success");
                return html2pdf().from(printContent).set(opt).outputPdf("blob");
            })
            .then(function (blob) {
                // Convert the PDF to a Blob
                // const blob = new Blob([pdf], { type: 'application/pdf' });
                showToast("PDF created, saving to storage...", "success");
                // Use Cordova File plugin to save the file
                window.resolveLocalFileSystemURL(cordova.file.externalRootDirectory + 'Download/', function (dirEntry) {
                    dirEntry.getFile(filename, { create: true, exclusive: false }, function (fileEntry) {
                        fileEntry.createWriter(function (writer) {
                            writer.onwriteend = function () {

                                // Show success message
                                showToast(`PDF saved successfully in downloads folder `, "success");
                                console.log("the pdf is saving at : " + fileEntry.nativeURL);
                            };
                            writer.onerror = function (error) {
                                console.log('Error writing file: ' + error);
                                showToast(`Error saving pdf : ${error}`, 'error');
                            };
                            writer.write(blob);
                        }, function (error) {
                            console.log('Error creating writer: ' + error);
                            showToast(`Error creating file writer ${error}`, 'error');
                        });
                    }, function (error) {
                        console.log('Error getting file: ' + error);
                        showToast(`Error getting file : ${JSON.stringify(error)}`, 'error');
                    });
                }, function (error) {
                    console.log('Error resolving file system: ' + error);
                    showToast(`Error resolving file system : ${JSON.stringify(error)}`, 'error');
                });
            })
            .catch(function (error) {
                console.log('Error generating PDF: ' + error);
                showToast(`Error generating PDF : ${JSON.stringify(error)}`, 'error');
            });
        // }
        // })
    }
    else {
        // Web browser PDF generation
        html2pdf()
            .from(printContent)
            .set(opt)
            .save()
            .catch(function (error) {
                console.log('Error generating PDF:', error);
                showToast(`Error generating PDF : ${JSON.stringify(error)}`, 'error');
            });
        showToast(`PDF saved successfully in downloads folder  `, "success");
    }

}

function readTransactions() {
    // let sheetdbApi = sheetdbApis[currentApiIndex];
    // The below api is taken from the sheetdb.io where our google sheet is linked for GET operations.
    fetch(`${sheetdbApi}/search?sheet=ClientTransactions&clientId=${id}&sort_by=date&sort_method=date&sort_date_format=d-m-Y&sort_order=asc`)
        .then((response) => response.json())
        .then((data) => {
            // Store all transactions globally for filtering
            allTransactions = data
            // data.sort((a, b) => {
            //     let dateA = new Date(a.date.split('-').reverse().join('-'));
            //     let dateB = new Date(b.date.split('-').reverse().join('-'));
            //     return dateA - dateB;
            // });

            displayTransactions(allTransactions);
        })
        .catch(error => console.log('Error fetching data:', error));
}

// Function to filter transactions based on selected date range
function filterTransactions() {
    let startDate = document.getElementById('startDate').value;
    let endDate = document.getElementById('endDate').value;

    console.log("start date is : ", startDate);
    console.log("End date is : ", endDate);

    if (!startDate) {
        showToast("Please select from date.", "error");
        return;
    } else if (!endDate) {
        showToast("Please select to date.", "error");
        return;
    } else if (new Date(endDate) < new Date(startDate)) {
        console.log("Invalid date range: End date must be after the start date.");
        showToast("Invalid date range: End date must be after the Start date.", "error");
        return;
    }

    filteredAmount = 0;
    let filteredData = allTransactions.filter(transaction => {
        let transactionDate = new Date(transaction.date.split('-').reverse().join('-'));
        if (transactionDate >= new Date(startDate) && transactionDate <= new Date(endDate)) {
            filteredAmount = Number(filteredAmount) + Number(transaction.transactionAmount || 0) - Number(transaction.cash || 0);
        }
        return transactionDate >= new Date(startDate) && transactionDate <= new Date(endDate);
    });
    totalAmount = filteredAmount;
    console.log("the filtered amount is : " + filteredAmount);
    displayTransactions(filteredData);
}

function clearDateFilter() {
    console.log("clear filter is called")
    document.getElementById('startDate').value = "";
    document.getElementById('endDate').value = "";
    filteredAmount = 0;
    totalAmount = amount;
    displayTransactions(allTransactions); // Reload all transactions
}

function formatToISO(dateStr) {
    const [day, month, year] = dateStr.split("-");
    return `${year}-${month}-${day}`;
}
let oldTransactionAmount;
let oldCash;
let editbuttons;
function editDetails(slNo, rowData) {
    // Parse the stringified data
    const data = typeof rowData === 'string' ? JSON.parse(rowData) : rowData;
    editbuttons = document.getElementsByClassName('detailsBtn');
    editbuttons = Array.from(editbuttons);
    editbuttons.forEach((button) => {
        button.disabled = true;
    })

    // Find the table row
    const rows = document.querySelectorAll('tr');
    const targetRow = Array.from(rows).find(row => row.querySelector('td')?.textContent.trim() === slNo.toString());

    if (!targetRow) return;

    // Get old transactionAmount and cash
    oldTransactionAmount = Number(data.transactionAmount) || 0;
    oldCash = Number(data.cash) || 0;

    // Get all cells
    const cells = targetRow.querySelectorAll('td');

    // Skip the first cell (serial number)
    // Make the date editable
    cells[1].innerHTML = `<input type="date" value="${formatToISO(data.date)}" class="edit-input date-input">`;

    // Make the bill number editable
    cells[2].innerHTML = `<input type="text" value="${data.billNo || ''}" class="edit-input billno-input">`;

    // Make the transaction amount editable
    cells[3].innerHTML = `<input type="number"  value="${data.transactionAmount || ''}" class="edit-input amount-input">`;

    // Make the cash editable
    cells[4].innerHTML = `<input type="number"  value="${data.cash || ''}" class="edit-input cash-input">`;

    // Make the remarks editable
    cells[5].innerHTML = `<textarea class="edit-input remarks-input">${data.remarks || ''}</textarea>`;

    // Replace action buttons
    cells[6].innerHTML = `
         <button id="saveChangesBtn" onclick='saveChanges(this,"${slNo}", ${data.id},${data.clientId})'>Save</button>
         <button id="cancelChangesBtn" onclick="cancelEdit('${slNo}')">Cancel</button>
    `;
}


function saveChanges(buttonElement, slNo, rowId, clientId) {
    // Find the row
    const rows = document.querySelectorAll('tr');
    const targetRow = Array.from(rows).find(row => row.querySelector('td')?.textContent.trim() === slNo.toString());

    if (!targetRow) return;

    // Get edited values
    const date = targetRow.querySelector('.date-input').value;
    const billNo = targetRow.querySelector('.billno-input').value;
    const newTransactionAmount = targetRow.querySelector('.amount-input').value;
    const newCash = targetRow.querySelector('.cash-input').value;
    const remarks = targetRow.querySelector('.remarks-input').value;

    if (date === "NaN-NaN-NaN") {
        showToast("Please select a transaction date", 'error');
        console.log("Please enter date");
        return;
    } else if (!newTransactionAmount && !newCash) {
        showToast("Please enter either Amount or Cash Received", 'error');
        console.log("Please enter either Amount or Cash.");
        return;
    } else if (date && (newTransactionAmount || newCash)) {

        const updatedTotalAmount = Number(amount) + ((Number(newTransactionAmount) || 0) - (Number(newCash) || 0)) - (oldTransactionAmount - oldCash);

        totalAmount = amount = updatedTotalAmount;

        // Update URL with new amount
        const url = new URL(window.location.href);
        url.searchParams.set('amount', updatedTotalAmount);
        window.history.replaceState({}, '', url);

        console.log("The updated total amount is : " + updatedTotalAmount);
        buttonElement.innerHTML = '<span class="btn-loader"></span>';
        buttonElement.disabled = true;
        // Update data (you would typically send this to your backend)
        const updatedData = {
            date,
            billNo,
            transactionAmount: newTransactionAmount,
            cash: newCash,
            remarks
        };
        // The below api is taken from the sheetdb.io where our google sheet is linked for PATCH operations.
        fetch(`${sheetdbApi}/id/${rowId}?sheet=ClientTransactions`, {
            method: 'PATCH',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        })
            .then(response => response.json())
            .then(data => {
                fetch(`${sheetdbApi}/id/${clientId}?sheet=ClientData`, {
                    method: 'PATCH',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ amount: updatedTotalAmount })
                })
                    .then(response => response.json())
                    .then(data => {
                        editbuttons.forEach((button) => {
                            button.disabled = false;
                        })
                        showToast('Transaction updated successfully', 'success');
                        resetSaveButton();
                        // Refresh the table display
                        readTransactions();
                        console.log('Saved the updated data:', updatedData);
                    })
                    .catch(err => {
                        console.error('Error updating amount in client data:', err);
                        showToast(`Error updating amount in client data: ${err}`, 'error');
                        resetSaveButton();
                        editbuttons.forEach((button) => {
                            button.disabled = false;
                        })
                    });
            })
            .catch(err => {
                console.error('Error updating transaction:', err);
                showToast(`Error updating transaction: ${err}`, 'error');
                resetSaveButton();
                // Refresh the table display
                readTransactions();
                editbuttons.forEach((button) => {
                    button.disabled = false;
                })
            });

        function resetSaveButton() {
            buttonElement.innerHTML = 'Save';
            buttonElement.disabled = false;
        }

    }
}

function cancelEdit(slNo) {
    // Simply refresh the table to revert changes
    if (allTransactions.length > 0) {
        editbuttons.forEach((button) => {
            button.disabled = false;
        })
        displayTransactions(allTransactions);
    }
}

// Function to group and display transactions
function displayTransactions(transactions) {
    const transactionTBody = document.getElementById('transactionTBody');
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    let groupedByMonth = {};
    let trtd = [];

    // Group transactions by month and year
    transactions.forEach(transaction => {
        const dateParts = transaction.date.split('-');
        const month = parseInt(dateParts[1]) - 1; // 0-based month index
        const year = dateParts[2];
        const monthYearKey = `${monthNames[month]} ${year}`;

        if (!groupedByMonth[monthYearKey]) {
            groupedByMonth[monthYearKey] = [];
        }

        groupedByMonth[monthYearKey].push(transaction);
    });

    let slNo = 1;

    if (transactions.length === 0) {
        trtd.push(`<tr><td colspan="7" style="text-align: center;">No transactions found for the selected date range.</td></tr>`);
    } else {
        Object.keys(groupedByMonth).forEach(monthYear => {
            const monthTransactions = groupedByMonth[monthYear];
            let monthlyTotal = 0; // Reset monthly total for each month

            trtd.push(`
                <tr class="month-header" style="background-color: #e0e0e0; font-weight: bold;">
                    <td colspan="7">${monthYear}</td>
                </tr>
            `);

            monthTransactions.forEach(each => {
                monthlyTotal = Number(monthlyTotal) + Number(each.transactionAmount || 0) - Number(each.cash || 0);
                trtd.push(`
                    <tr>
                        <td>${slNo}</td>    
                        <td class="date">${each.date}</td>
                        <td class="billno">${each.billNo ? each.billNo : "-"}</td>
                        <td class="amount">${each.transactionAmount ? each.transactionAmount : "-"}</td>
                        <td class="cash">${each.cash ? each.cash : "-"}</td>
                        <td class="remarks">${each.remarks ? each.remarks : "-"}</td>
                         <td class="action">
                                <button class="detailsBtn" onclick='editDetails("${slNo}", ${JSON.stringify(each)})'>Edit</button>
                                <button class="deleteClientBtn" onclick='showConfirmModal("${slNo}", ${JSON.stringify(each)})' >Delete</button>
                         </td>  
                    </tr>
                `);
                slNo++;
            });
            // Add monthly total row
            trtd.push(`
        <tr class="monthly-total-row" style="background-color: #d3d3d3; font-weight: bold;">
            <td colspan="5" style="text-align: left;">Monthly Total:</td>
            <td style="text-align: right;" colspan="2">${monthlyTotal}</td>
        </tr>
    `);
            trtd.push(`<tr class="month-separator"><td colspan="7" style="border-bottom: 1px dashed #ccc;"></td></tr>`);
        });

        trtd.push(`
            <tr class="total-row" style="background-color: #b9adad66; font-size: 18.5px">
                <td colspan="5" style="text-align: left; font-weight: bold;">Total :</td>
                <td style="font-weight: bold; text-align: right" colspan="2">${totalAmount}</td>
            </tr>
        `);
    }

    transactionTBody.innerHTML = trtd.join("");
}

// Initial fetch when the page loads
readTransactions();

let dataToBeDeleted = {}
function showConfirmModal(slno, rowData) {
    // Store the id to be deleted
    const data = typeof rowData === 'string' ? JSON.parse(rowData) : rowData;
    console.log(` slno: ${slno} `);
    dataToBeDeleted = {
        transactionId: data.id,
        clientId: data.clientId,
        transactionAmount: data.transactionAmount,
        cash: data.cash,
    }
    console.log('the required data for deletion is : ', dataToBeDeleted);
    document.getElementById('clientNumberDisplay').textContent = slno;
    // Display the confirmation modal
    document.getElementById('confirmModal').style.display = 'flex';
    document.getElementById('confirmOverlay').style.display = 'block';
    document.body.classList.add('no-scroll');

}

document.getElementById('confirmDeleteBtn').addEventListener('click', function () {
    if (dataToBeDeleted.clientId !== null) {
        // Update button to show loading state
        this.innerHTML = '<span>Deleting...</span> <span class="btn-loader"></span>';
        this.disabled = true;
        document.getElementById('cancelDeleteBtn').disabled = true;

        // Call the deleteTransaction function if the user confirms
        deleteTransaction(dataToBeDeleted);
    }
});

let deleteTransaction = (data) => {
    const clientId = data.clientId;
    const transactionId = data.transactionId;
    const updatedTotalAmount = Number(amount) - ((Number(data.transactionAmount) || 0) - (Number(data.cash) || 0));

    totalAmount = amount = updatedTotalAmount;

    // Update URL with new amount
    const url = new URL(window.location.href);
    url.searchParams.set('amount', updatedTotalAmount);
    window.history.replaceState({}, '', url);

    console.log("The updated total amount after deletion is : " + updatedTotalAmount);
    // The below api is taken from the sheetdb.io where our google sheet is linked for PATCH and DELETE operations.
    fetch(`${sheetdbApi}/id/${clientId}?sheet=ClientData`, {
        method: 'PATCH',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: updatedTotalAmount })
    })
        .then(response => response.json())
        .then(data => {
            console.log('amount updated successfully in client data table during deletion  :', data);
            fetch(`${sheetdbApi}/id/${transactionId}?sheet=ClientTransactions`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            })
                .then((response) => response.json())
                .then((data) => {
                    console.log('Data deleted successfully:', data);
                    readTransactions();
                    showToast("Transaction deleted successfully", 'success');
                    closeDeleteModal();
                }
                )
        }
        )
        .catch((error) => {
            console.log('Error during cascade deletion:', error);
            showToast("An error occurred during deletion. Please try again.", 'error');
            closeDeleteModal();
        });
}
// Handle the cancel button click
document.getElementById('cancelDeleteBtn').addEventListener('click', function () {
    // Close the modal without deleting
    closeDeleteModal();
});

// Close the modal and reset clientIdToDelete
function closeDeleteModal() {
    document.getElementById('confirmModal').style.display = 'none';
    document.getElementById('confirmOverlay').style.display = 'none';

    // Reset button text if it was changed
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.innerHTML = 'Yes, Delete';
    confirmBtn.disabled = false;
    document.getElementById('cancelDeleteBtn').disabled = false;
    document.body.classList.remove('no-scroll');
    dataToBeDeleted = {};

}

function showToast(message, type, duration = 3000) {
    // Create toast container if not exists
    if (!document.getElementById("toast-container")) {
        const toastContainer = document.createElement("div");
        toastContainer.id = "toast-container";
        toastContainer.style.position = "fixed";
        toastContainer.style.top = "50%";
        toastContainer.style.left = "50%";
        toastContainer.style.transform = "translate(-50%, -50%)";
        toastContainer.style.zIndex = "1000";
        document.body.appendChild(toastContainer);
    }

    // Create toast message
    const toast = document.createElement("div");
    toast.className = `toast-${type} `;
    toast.id = "toast-element"
    // toast.textContent = message;
    const icon = type === 'success'
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    toast.innerHTML = `
                    <div class="toast-icon">${icon}</div>
                    <div class="toast-message">${message}</div>
                `;
    toast.style.padding = "12px 20px";
    toast.style.borderRadius = "5px";
    toast.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
    toast.style.marginTop = "10px";
    toast.style.fontSize = "15px";
    toast.style.transition = "opacity 0.5s ease";
    toast.style.opacity = "1";

    // Append toast to container
    document.getElementById("toast-container").appendChild(toast);

    // Remove toast after duration
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 500); // Smooth fade-out effect
    }, duration);
}
