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
    const resultsHead = document.getElementById('resultsHead');
    const resultsBody = document.getElementById('resultsBody');
    const resultUserName = document.getElementById('resultUserName');
    const userNameInput = document.getElementById('userName');
    const exportCsvBtn = document.getElementById('exportCsvBtn');

    let selectedFiles = [];
    let processedDocs = [];
    let knownHeaders = ['Document Name', 'Document Type'];

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
        
        // Reset state for new batch
        processedDocs = [];
        knownHeaders = ['Document Name', 'Document Type'];
        exportCsvBtn.classList.add('hidden');
        resultsBody.innerHTML = '';
        
        // UI Updates
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Processing documents. This may take a while...';
        document.querySelector('.upload-section').classList.add('hidden');
        loaderSection.classList.remove('hidden');
        resultsSection.classList.remove('hidden'); 
        
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
        
        if (processedDocs.length > 0) {
            exportCsvBtn.classList.remove('hidden');
        }
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
            
            // Push valid data
            processedDocs.push(data);
            
            // Discover new headers dynamically
            if (data.fields && typeof data.fields === 'object') {
                Object.keys(data.fields).forEach(key => {
                    const formattedKey = key;
                    if (!knownHeaders.includes(formattedKey)) {
                        knownHeaders.push(formattedKey);
                    }
                });
            }
            
            renderTable();
        } catch (error) {
            console.error('Error processing file:', error);
            processedDocs.push({
                isError: true,
                raw_filename: file.name,
                error_message: error.message
            });
            renderTable();
        }
    }

    function renderTable() {
        // We no longer build lateral HTML headers dynamically. Fixed in the HTML file.
        resultsBody.innerHTML = '';
        
        processedDocs.forEach(data => {
            if (data.isError) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td></td>
                    <td>${data.raw_filename}</td>
                    <td colspan="2" class="empty-cell" style="color: #ef4444;">Processing Error: ${data.error_message}</td>
                `;
                tr.style.background = 'rgba(239, 68, 68, 0.1)';
                resultsBody.appendChild(tr);
                return;
            }

            // Construct 1: Main Toggleable Row
            const mainTr = document.createElement('tr');
            mainTr.className = 'main-row';
            
            const hasDetails = data.fields && Object.keys(data.fields).length > 0;
            
            mainTr.innerHTML = `
                <td style="text-align: center;">
                    ${hasDetails ? '<button class="toggle-btn">▼</button>' : ''}
                </td>
                <td style="font-weight: 500;">${data.raw_filename || 'Unknown'}</td>
                <td><span style="background: rgba(79, 70, 229, 0.2); color: #a78bfa; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;">${formatCellText(data.document_type)}</span></td>
                <td>
                    <a href="${data.preview_url || '#'}" target="_blank" class="preview-btn">Preview</a>
                </td>
            `;

            resultsBody.appendChild(mainTr);

            // Construct 2: Slide-down Detail Grid Row
            if (hasDetails) {
                const detailTr = document.createElement('tr');
                detailTr.className = 'accordion-detail';
                
                let detailsHTML = '<div class="detail-content">';
                Object.entries(data.fields).forEach(([key, val]) => {
                    detailsHTML += `
                        <div class="detail-item">
                            <span class="detail-label">${key}</span>
                            <span class="detail-value">${val || '<i class="empty-cell">Manual Verification Needed</i>'}</span>
                        </div>
                    `;
                });
                detailsHTML += '</div>';
                
                detailTr.innerHTML = `<td colspan="4" style="padding:0; border:none;">${detailsHTML}</td>`;
                resultsBody.appendChild(detailTr);

                // Apply Click Interaction
                mainTr.addEventListener('click', (e) => {
                    // Ignore clicks on action buttons
                    if (e.target.closest('a')) return;
                    
                    const btn = mainTr.querySelector('.toggle-btn');
                    const isOpen = detailTr.classList.contains('open');
                    
                    if (isOpen) {
                        detailTr.classList.remove('open');
                        if (btn) btn.classList.remove('active');
                    } else {
                        // Uncomment below to act as strict accordion (auto-close others)
                        // document.querySelectorAll('.accordion-detail.open').forEach(el => el.classList.remove('open'));
                        // document.querySelectorAll('.toggle-btn.active').forEach(el => el.classList.remove('active'));
                        detailTr.classList.add('open');
                        if (btn) btn.classList.add('active');
                    }
                });
            }
        });
    }

    function formatCellText(text) {
        if (text === undefined || text === null || text === '' || (typeof text === 'string' && text.trim() === '')) {
            return '<span class="empty-cell">Manual Verification Needed</span>';
        }
        return text;
    }

    // CSV Export Logic
    exportCsvBtn.addEventListener('click', () => {
        if (processedDocs.length === 0) return;
        
        let csvContent = "";
        
        // Headers
        csvContent += knownHeaders.map(h => `"${h}"`).join(',') + "\n";
        
        // Rows
        processedDocs.forEach(data => {
            if (data.isError) {
                // Write error row
                let row = [`"${data.raw_filename}"`, `"${data.error_message}"`];
                csvContent += row.join(',') + "\\n";
            } else {
                let row = knownHeaders.map(header => {
                    let val = "";
                    if (header === 'Document Name') val = data.raw_filename || "";
                    else if (header === 'Document Type') val = data.document_type || "";
                    else val = data.fields ? (data.fields[header] || "") : "";
                    
                    // Escape quotes for CSV
                    val = val.toString().replace(/"/g, '""');
                    return `"${val}"`;
                });
                csvContent += row.join(',') + "\n";
            }
        });
        
        // Create Blob and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `docuparse_extraction_${resultUserName.textContent.replace(' ', '_')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});
