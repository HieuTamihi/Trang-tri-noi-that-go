// Khởi tạo
let currentId = null;
let rowCount = 0;

// Biến lưu trữ dữ liệu toàn cục (được load từ server)
let GLOBAL_SAVED_DATA = [];

document.addEventListener('DOMContentLoaded', function() {
    // Load dữ liệu từ server khi trang vừa mở
    fetchSavedData().then(() => {
        loadSavedList();
    });

    addRow(); // Thêm 1 dòng mặc định
    addRow();
    addRow();
});

// Hàm gọi API lấy dữ liệu từ JSONbin.io
async function fetchSavedData() {
    // Kiểm tra cấu hình
    if (!JSONBIN_CONFIG || JSONBIN_CONFIG.API_KEY === 'PASTE_YOUR_API_KEY_HERE') {
        console.warn('Chưa cấu hình JSONbin.io! Sử dụng localStorage.');
        GLOBAL_SAVED_DATA = JSON.parse(localStorage.getItem('businessData') || '[]');
        return GLOBAL_SAVED_DATA;
    }

    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_CONFIG.BIN_ID}/latest`, {
            method: 'GET',
            headers: {
                'X-Master-Key': JSONBIN_CONFIG.API_KEY
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            // Xử lý format {"data": [...]} từ JSONbin
            const record = result.record || {};
            GLOBAL_SAVED_DATA = record.data || [];
            // Đồng bộ vào localStorage để offline vẫn xem được
            localStorage.setItem('businessData', JSON.stringify(GLOBAL_SAVED_DATA));
            return GLOBAL_SAVED_DATA;
        } else {
            console.error('Lỗi load dữ liệu:', response.statusText);
            // Fallback về localStorage
            GLOBAL_SAVED_DATA = JSON.parse(localStorage.getItem('businessData') || '[]');
            return GLOBAL_SAVED_DATA;
        }
    } catch (error) {
        console.error('Lỗi kết nối JSONbin:', error);
        // Fallback về localStorage khi offline
        GLOBAL_SAVED_DATA = JSON.parse(localStorage.getItem('businessData') || '[]');
        return GLOBAL_SAVED_DATA;
    }
}

// Hàm gọi API lưu dữ liệu lên JSONbin.io
async function updateServerData(newData) {
    // Luôn lưu vào localStorage để backup
    localStorage.setItem('businessData', JSON.stringify(newData));
    GLOBAL_SAVED_DATA = newData;
    loadSavedList();

    // Kiểm tra cấu hình
    if (!JSONBIN_CONFIG || JSONBIN_CONFIG.API_KEY === 'PASTE_YOUR_API_KEY_HERE') {
        console.warn('Chưa cấu hình JSONbin.io! Chỉ lưu localStorage.');
        return true;
    }

    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_CONFIG.BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_CONFIG.API_KEY
            },
            // Lưu theo format {"data": [...]} để phù hợp với JSONbin
            body: JSON.stringify({ data: newData })
        });
        
        if (response.ok) {
            return true;
        } else {
            console.error('Lỗi lưu lên JSONbin:', response.statusText);
            alert('Lỗi khi đồng bộ lên server, nhưng đã lưu trên máy bạn.');
            return false;
        }
    } catch (error) {
        console.error('Lỗi kết nối JSONbin khi lưu:', error);
        alert('Không có kết nối mạng, nhưng đã lưu trên máy bạn.');
        return false;
    }
}

// Thêm dòng mới vào bảng
function addRow() {
    rowCount++;
    const tbody = document.getElementById('transactionBody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="date" class="date-input" onchange="updateTotal()"></td>
        <td><input type="text" class="transaction-input" placeholder="Mô tả giao dịch..."></td>
        <td><input type="text" class="amount-input" placeholder="0" oninput="formatCurrencyInput(this)" onchange="updateTotal()"></td>
        <td style="text-align: center;"><button class="btn-delete-row" onclick="deleteRow(this)">×</button></td>
    `;
    tbody.appendChild(row);
}

// Format input tiền tệ khi nhập
function formatCurrencyInput(input) {
    // Xóa tất cả ký tự không phải số
    let value = input.value.replace(/\D/g, '');
    
    // Format dạng 100.000
    if (value) {
        value = new Intl.NumberFormat('vi-VN').format(parseInt(value));
    }
    
    input.value = value;
    updateTotal();
}

// Xóa dòng
function deleteRow(btn) {
    const row = btn.closest('tr');
    row.remove();
    updateRowNumbers();
    updateTotal();
}

// Cập nhật số thứ tự
function updateRowNumbers() {
    const rows = document.querySelectorAll('#transactionBody tr');
    rowCount = rows.length;
    // Không cập nhật nội dung cột đầu tiên vì bảng này không có cột STT, cột đầu là Ngày tháng
}

// Cập nhật tổng tiền
function updateTotal() {
    const amounts = document.querySelectorAll('.amount-input');
    let total = 0;
    amounts.forEach(input => {
        // Chuyển đổi "100.000" -> 100000 để tính toán
        const valueStr = input.value.replace(/\./g, '');
        const value = parseFloat(valueStr) || 0;
        total += value;
    });
    document.getElementById('totalAmount').textContent = formatCurrency(total);
}

// Format tiền tệ
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

// Lấy dữ liệu từ form
function getFormData() {
    const transactions = [];
    const rows = document.querySelectorAll('#transactionBody tr');
    rows.forEach((row, index) => {
        const dateEl = row.querySelector('.date-input');
        const transactionEl = row.querySelector('.transaction-input');
        const amountEl = row.querySelector('.amount-input');
        
        if (!dateEl || !transactionEl || !amountEl) return;
        
        const dateInput = dateEl.value;
        const transaction = transactionEl.value;
        const amountStr = amountEl.value.replace(/\./g, '');
        const amount = parseFloat(amountStr) || 0;
        if (dateInput || transaction || amount > 0) {
            transactions.push({
                stt: index + 1,
                date: dateInput,
                transaction: transaction,
                amount: amount
            });
        }
    });

    return {
        id: currentId || Date.now().toString(),
        businessName: document.getElementById('businessName').value,
        address: document.getElementById('address').value,
        taxCode: document.getElementById('taxCode').value,
        businessLocation: document.getElementById('businessLocation').value,
        declarationPeriod: document.getElementById('declarationPeriod').value,
        representative: document.getElementById('representative').value,
        signDay: document.getElementById('signDay').value,
        signMonth: document.getElementById('signMonth').value,
        signYear: document.getElementById('signYear').value,
        transactions: transactions,
        savedAt: new Date().toISOString()
    };
}

// Điền dữ liệu vào form
function fillFormData(data) {
    currentId = data.id;
    document.getElementById('businessName').value = data.businessName || '';
    document.getElementById('address').value = data.address || '';
    document.getElementById('taxCode').value = data.taxCode || '';
    document.getElementById('businessLocation').value = data.businessLocation || '';
    document.getElementById('declarationPeriod').value = data.declarationPeriod || '';
    document.getElementById('representative').value = data.representative || '';
    document.getElementById('signDay').value = data.signDay || '';
    document.getElementById('signMonth').value = data.signMonth || '';
    document.getElementById('signYear').value = data.signYear || '';

    // Xóa các dòng cũ
    document.getElementById('transactionBody').innerHTML = '';
    rowCount = 0;

    // Thêm các dòng từ dữ liệu
    if (data.transactions && data.transactions.length > 0) {
        data.transactions.forEach(t => {
            addRow();
            const rows = document.querySelectorAll('#transactionBody tr');
            const lastRow = rows[rows.length - 1];
            lastRow.querySelector('.date-input').value = t.date || '';
            lastRow.querySelector('.transaction-input').value = t.transaction || '';
            
            // Format sô tiền khi load lại
            const amountInput = lastRow.querySelector('.amount-input');
            const amountVal = t.amount || 0;
            amountInput.value = amountVal > 0 ? new Intl.NumberFormat('vi-VN').format(amountVal) : '';
        });
    } else {
        addRow();
        addRow();
        addRow();
    }
    updateTotal();
}

// Lưu dữ liệu
function saveData() {
    const data = getFormData();
    
    if (!data.businessName || !data.taxCode) {
        alert('Vui lòng nhập tên hộ kinh doanh và mã số thuế!');
        return;
    }

    // Sử dụng biến toàn cục
    let savedData = [...GLOBAL_SAVED_DATA];
    
    const existingIndex = savedData.findIndex(item => item.id === data.id);
    if (existingIndex >= 0) {
        savedData[existingIndex] = data;
    } else {
        savedData.push(data);
    }

    // Gửi lên server
    updateServerData(savedData).then(success => {
        if (success) {
            currentId = data.id;
            
            // Lưu default localstorage để tiện cho việc tạo mới nhanh
            const defaultInfo = {
                businessName: data.businessName,
                address: data.address,
                taxCode: data.taxCode,
                businessLocation: data.businessLocation,
                representative: data.representative
            };
            localStorage.setItem('defaultBusinessInfo', JSON.stringify(defaultInfo));

            alert('Đã lưu thông tin thành công lên Server!');
        }
    });
}

// Load danh sách đã lưu
function loadSavedList() {
    const savedData = GLOBAL_SAVED_DATA;
    const container = document.getElementById('savedList');
    
    if (savedData.length === 0) {
        container.innerHTML = '<p style="color: #999; font-size: 13px;">Chưa có dữ liệu nào được lưu</p>';
        return;
    }

    container.innerHTML = savedData.map(item => `
        <div class="saved-item" data-id="${item.id}">
            <div class="name">${item.businessName}</div>
            <div class="tax">MST: ${item.taxCode}</div>
            <div class="date">Lưu: ${new Date(item.savedAt).toLocaleDateString('vi-VN')}</div>
            <div class="actions">
                <button class="btn-load" onclick="loadData('${item.id}')">Mở</button>
                <button class="btn-delete" onclick="deleteData('${item.id}')">Xóa</button>
            </div>
        </div>
    `).join('');
}

// Load dữ liệu
function loadData(id) {
    const savedData = GLOBAL_SAVED_DATA;
    const data = savedData.find(item => item.id === id);
    if (data) {
        fillFormData(data);
    }
}

// Xóa dữ liệu
function deleteData(id) {
    if (!confirm('Bạn có chắc muốn xóa dữ liệu này?')) return;
    
    // Sử dụng biến toàn cục
    let savedData = [...GLOBAL_SAVED_DATA];
    savedData = savedData.filter(item => item.id !== id);
    
    // Gửi cập nhật lên server
    updateServerData(savedData).then(success => {
        if (success) {
            if (currentId === id) {
                createNew();
            }
        }
    });
}

// Tạo mới
function createNew() {
    currentId = null;
    document.getElementById('businessForm').reset();
    document.getElementById('transactionBody').innerHTML = '';
    rowCount = 0;
    
    // Load thông tin mặc định nếu có
    const defaultInfo = JSON.parse(localStorage.getItem('defaultBusinessInfo') || '{}');
    if (defaultInfo.businessName) {
        document.getElementById('businessName').value = defaultInfo.businessName;
        document.getElementById('address').value = defaultInfo.address || '';
        document.getElementById('taxCode').value = defaultInfo.taxCode || '';
        document.getElementById('businessLocation').value = defaultInfo.businessLocation || '';
        document.getElementById('representative').value = defaultInfo.representative || '';
    }

    addRow();
    addRow();
    addRow();
    document.getElementById('signDay').value = new Date().getDate();
    document.getElementById('signMonth').value = new Date().getMonth() + 1;
    document.getElementById('signYear').value = new Date().getFullYear();
    updateTotal();
}

// Hiển thị xem trước
function showPreview() {
    const data = getFormData();
    
    if (!data.businessName) {
        alert('Vui lòng nhập thông tin hộ kinh doanh!');
        return;
    }

    const total = data.transactions.reduce((sum, t) => sum + t.amount, 0);
    
    let transactionRows = '';
    data.transactions.forEach(t => {
        const dateStr = t.date ? formatDate(t.date) : '';
        transactionRows += `
            <tr>
                <td style="text-align: center;">${dateStr}</td>
                <td>${t.transaction}</td>
                <td style="text-align: right;">${formatCurrency(t.amount)}</td>
            </tr>
        `;
    });

    const previewHTML = `
        <div class="preview-header">
            <div class="preview-left">
                <p><strong>HỘ, CÁ NHÂN KINH DOANH:</strong> ${data.businessName}</p>
                <p><strong>Địa chỉ:</strong> ${data.address}</p>
                <p><strong>Mã số thuế:</strong> ${data.taxCode}</p>
            </div>
            <div class="preview-right">
                <p><strong>Mẫu số S1a-HKD</strong></p>
                <p>(Ban hành kèm theo Thông tư số</p>
                <p>.../${data.signYear}/TT-BTC ngày ... tháng ... năm</p>
                <p>${data.signYear} của Bộ trưởng Bộ Tài chính)</p>
            </div>
        </div>

        <div class="preview-title">
            <h2>SỔ CHI TIẾT DOANH THU BÁN HÀNG HÓA, DỊCH VỤ</h2>
        </div>

        <div class="preview-info">
            <p>Địa điểm kinh doanh: ${data.businessLocation || '...................................'}</p>
            <p>Kỳ kê khai: ${data.declarationPeriod || '...................................'}</p>
        </div>

        <table class="preview-table">
            <thead>
                <tr>
                    <th style="width: 120px;">Ngày tháng</th>
                    <th>Giao dịch</th>
                    <th style="width: 150px;">Số tiền</th>
                </tr>
            </thead>
            <tbody>
                ${transactionRows}
            </tbody>
            <tfoot>
                <tr>
                    <td></td>
                    <td>Tổng cộng</td>
                    <td style="text-align: right;">${formatCurrency(total)}</td>
                </tr>
            </tfoot>
        </table>

        <div class="preview-signature">
            <p>Ngày ${data.signDay} tháng ${data.signMonth} năm ${data.signYear}</p>
            <p class="sign-title">NGƯỜI ĐẠI DIỆN HỘ KINH DOANH/</p>
            <p class="sign-title">CÁ NHÂN KINH DOANH</p>
            <p style="font-style: italic;">(Ký, họ tên, đóng dấu)</p>
            <br><br><br>
            <p><strong>${data.representative || ''}</strong></p>
        </div>
    `;

    document.getElementById('previewContent').innerHTML = previewHTML;
    document.getElementById('previewModal').style.display = 'block';
}

// Đóng xem trước
function closePreview() {
    document.getElementById('previewModal').style.display = 'none';
}

// Format ngày
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN');
}

// Xuất PDF
function exportPDF() {
    const element = document.getElementById('previewContent');
    const data = getFormData();
    const orientation = document.getElementById('pageOrientation').value;
    
    const opt = {
        margin: [10, 10, 10, 10],
        filename: `So_chi_tiet_doanh_thu_${data.taxCode || 'HKD'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: orientation }
    };

    html2pdf().set(opt).from(element).save();
}


// Xuất Word (dùng HTML để Word mở được)
function exportWord() {
    const data = getFormData();
    const total = data.transactions.reduce((sum, t) => sum + t.amount, 0);
    const orientation = document.getElementById('pageOrientation').value;
    
    let transactionRows = '';
    data.transactions.forEach(t => {
        const dateStr = t.date ? formatDate(t.date) : '';
        transactionRows += `
            <tr>
                <td style="text-align: center; border: 1px solid #000; padding: 5px;">${dateStr}</td>
                <td style="border: 1px solid #000; padding: 5px;">${t.transaction}</td>
                <td style="text-align: right; border: 1px solid #000; padding: 5px;">${formatCurrency(t.amount)}</td>
            </tr>
        `;
    });

    const pageStyle = orientation === 'landscape' 
        ? '@page { size: A4 landscape; margin: 1.5cm; }' 
        : '@page { size: A4 portrait; margin: 1.5cm; }';

    const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="utf-8">
            <style>
                ${pageStyle}
                body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; }
                table { border-collapse: collapse; width: 100%; }
                th { border: 1px solid #000; padding: 5px; font-weight: bold; }
                p { margin: 3px 0; }
                .title { text-align: center; margin: 15px 0; }
                .title h2 { font-size: 13pt; margin: 0; }
                .info { text-align: center; margin: 10px 0; }
                .signature { text-align: right; margin-top: 25px; }
            </style>
        </head>
        <body>
            <table style="width: 100%; border: none;">
                <tr>
                    <td style="border: none; vertical-align: top; width: 55%;">
                        <p><b>HỘ, CÁ NHÂN KINH DOANH:</b> ${data.businessName}</p>
                        <p><b>Địa chỉ:</b> ${data.address}</p>
                        <p><b>Mã số thuế:</b> ${data.taxCode}</p>
                    </td>
                    <td style="border: none; text-align: right; vertical-align: top; width: 45%;">
                        <p><b>Mẫu số S1a-HKD</b></p>
                        <p style="font-size: 10pt;">(Ban hành kèm theo Thông tư số</p>
                        <p style="font-size: 10pt;">.../${data.signYear}/TT-BTC ngày ... tháng ... năm</p>
                        <p style="font-size: 10pt;">${data.signYear} của Bộ trưởng Bộ Tài chính)</p>
                    </td>
                </tr>
            </table>

            <div class="title">
                <h2>SỔ CHI TIẾT DOANH THU BÁN HÀNG HÓA, DỊCH VỤ</h2>
            </div>

            <div class="info">
                <p>Địa điểm kinh doanh: ${data.businessLocation || '...................................'}</p>
                <p>Kỳ kê khai: ${data.declarationPeriod || '...................................'}</p>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 100px;">Ngày tháng</th>
                        <th>Giao dịch</th>
                        <th style="width: 120px;">Số tiền</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactionRows}
                </tbody>
                <tfoot>
                    <tr>
                        <td style="border: 1px solid #000; padding: 8px; height: 25px;"></td>
                        <td style="border: 1px solid #000; padding: 8px; height: 25px;">Tổng cộng</td>
                        <td style="text-align: right; border: 1px solid #000; padding: 8px; height: 25px;">${formatCurrency(total)}</td>
                    </tr>
                </tfoot>
            </table>

            <div class="signature">
                <p><i>Ngày ${data.signDay} tháng ${data.signMonth} năm ${data.signYear}</i></p>
                <p><b>NGƯỜI ĐẠI DIỆN HỘ KINH DOANH/</b></p>
                <p><b>CÁ NHÂN KINH DOANH</b></p>
                <p><i>(Ký, họ tên, đóng dấu)</i></p>
                <br><br><br>
                <p><b>${data.representative || ''}</b></p>
            </div>
        </body>
        </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `So_chi_tiet_doanh_thu_${data.taxCode || 'HKD'}.doc`;
    a.click();
    URL.revokeObjectURL(url);
}

// Đóng modal khi click bên ngoài
window.onclick = function(event) {
    const modal = document.getElementById('previewModal');
    if (event.target === modal) {
        closePreview();
    }
}

// (Các hàm exportJSON và importJSON đã bị ẩn hoặc không dùng nữa)

// Nhập dữ liệu JSON
function importJSON(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (!Array.isArray(importedData)) {
                alert('File không hợp lệ (phải là danh sách)!');
                return;
            }

            // Merge dữ liệu: Nếu ID trùng thì ghi đè, chưa có thì thêm mới
            let currentData = JSON.parse(localStorage.getItem('businessData') || '[]');
            
            importedData.forEach(newItem => {
                const index = currentData.findIndex(d => d.id === newItem.id);
                if (index !== -1) {
                    currentData[index] = newItem;
                } else {
                    currentData.push(newItem);
                }
            });

            localStorage.setItem('businessData', JSON.stringify(currentData));
            loadSavedList();
            alert(`Đã nhập thành công ${importedData.length} bản ghi!`);
            
            // Xóa input để có thể chọn lại cùng file nếu muốn
            input.value = '';
        } catch (error) {
            console.error(error);
            alert('Lỗi đọc file JSON: ' + error.message);
        }
    };
    reader.readAsText(file);
}
