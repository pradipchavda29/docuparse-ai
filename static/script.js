document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const uploadForm = document.getElementById('uploadForm');
    const submitBtn = document.getElementById('submitBtn');
    
    const loaderSection = document.getElementById('loaderSection');
    const currentDocNum = document.getElementById('currentDocNum');
    const totalDocNum = document.getElementById('totalDocNum');
    const loaderFilename = document.getElementById('loaderFilename');
    
    const resultsSection = document.getElementById('resultsSection');
    const resultsBody = document.getElementById('resultsBody');
    const resultUserName = document.getElementById('resultUserName');
    const userNameInput = document.getElementById('userName');

    let selectedFiles = [];

    // Drag and Drop Logic
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('dragover'), false);
    });

    dropArea.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', handleFiles, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles({ target: { files: files } });
    }

    function handleFiles(e) {
        const files = Array.from(e.target.files);
        const pdfFiles = files.filter(file => file.name.toLowerCase().endsWith('.pdf'));
        
        if (pdfFiles.length !== files.length) {
            alert('Only PDF files are allowed.');
        }

        selectedFiles = [...selectedFiles, ...pdfFiles];
        updateFileList();
    }

    function updateFileList() {
        fileList.innerHTML = '';
        selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span>${file.name}</span>
                <span class="file-remove" data-index="${index}">✕</span>
            `;
            fileList.appendChild(fileItem);
        });

        // Add event listeners to remove buttons
        document.querySelectorAll('.file-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                selectedFiles.splice(index, 1);
                updateFileList();
            });
        });
    }

    // Form Submit
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (selectedFiles.length === 0) {
            alert('Please select at least one PDF document.');
            return;
        }

        const userName = userNameInput.value.trim();
        resultUserName.textContent = userName;
        
        // UI Updates
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Processing documents. This may take a while...';
        document.querySelector('.upload-section').classList.add('hidden');
        loaderSection.classList.remove('hidden');
        
        // Show table but empty it and scroll
        resultsSection.classList.remove('hidden'); 
        resultsBody.innerHTML = ''; 
        
        totalDocNum.textContent = selectedFiles.length;
        
        // Process files 1 by 1
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            currentDocNum.textContent = i + 1;
            loaderFilename.textContent = `File: ${file.name}`;
            
            await processFile(file);
        }
        
        // Finished
        loaderSection.classList.add('hidden');
        document.querySelector('.upload-section').classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit Another Batch <span class="arrow">→</span>';
        selectedFiles = [];
        updateFileList();
        fileInput.value = '';
    });

    async function processFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            appendResultRow(data);
        } catch (error) {
            console.error('Error processing file:', error);
            // Append a row indicating error
            appendErrorRow(file.name, error.message);
        }
    }

    function formatCellText(text) {
        // Strict empty check
        if (text === undefined || text === null || text.trim() === '') {
            return '<span class="empty-cell">Manual Verification Needed</span>';
        }
        return text;
    }

    function appendResultRow(data) {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${formatCellText(data.document_name)}</td>
            <td>${formatCellText(data.document_id)}</td>
            <td>${formatCellText(data.issue_date)}</td>
            <td>${formatCellText(data.expiry_date)}</td>
            <td>${formatCellText(data.issuing_authority)}</td>
            <td>${formatCellText(data.place)}</td>
            <td>
                <a href="${data.preview_url}" target="_blank" class="preview-btn">Preview</a>
            </td>
        `;
        
        resultsBody.appendChild(tr);
    }

    function appendErrorRow(filename, errorMsg) {
        const tr = document.createElement('tr');
        tr.style.background = 'rgba(239, 68, 68, 0.1)';
        
        tr.innerHTML = `
            <td>${filename}</td>
            <td colspan="5" class="empty-cell" style="color: #ef4444;">Processing Error: ${errorMsg}</td>
            <td>-</td>
        `;
        
        resultsBody.appendChild(tr);
    }
});
