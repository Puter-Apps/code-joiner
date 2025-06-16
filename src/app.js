// Global variables
        let uploadedFiles = {
            html: null,
            css: null,
            js: null
        };
        let combinedCode = '';

        // File type mapping
        const fileTypeMap = {
            'html': { icon: '<i class="fas fa-file-code" style="color: #667eea;"></i>', name: 'HTML' },
            'css': { icon: '<i class="fas fa-palette" style="color: #667eea;"></i>', name: 'CSS' },
            'js': { icon: '<i class="fas fa-bolt" style="color: #667eea;"></i>', name: 'JavaScript' }
        };

        // Initialize drag and drop functionality
        function initializeDragDrop() {
            const dropZone = document.getElementById('dropZone');
            const fileInput = document.getElementById('fileInput');

            // Click to browse
            dropZone.addEventListener('click', () => {
                fileInput.click();
            });

            // File input change
            fileInput.addEventListener('change', (e) => {
                handleFiles(e.target.files);
            });

            // Drag and drop events
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });

            dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                handleFiles(e.dataTransfer.files);
            });
        }

        // Handle uploaded files
        function handleFiles(files) {
            const validFiles = Array.from(files).filter(file => {
                const extension = file.name.split('.').pop().toLowerCase();
                return ['html', 'css', 'js'].includes(extension);
            });

            if (validFiles.length === 0) {
                showStatus('Please upload only .html, .css, or .js files', 'error');
                return;
            }

            // Process each file
            validFiles.forEach(file => {
                const extension = file.name.split('.').pop().toLowerCase();
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    uploadedFiles[extension] = {
                        name: file.name,
                        content: e.target.result,
                        size: file.size
                    };
                    updateFilesList();
                    updateButtons();
                };
                
                reader.readAsText(file);
            });

            showStatus(`Processing ${validFiles.length} file(s)...`, 'info');
        }

        /**
         * Load files from Puter folder
         * 
         * Puter.js Tutorial:
         * - puter.auth.isSignedIn(): Checks if the user is currently authenticated with Puter
         *   This is important before accessing any user storage to ensure proper permissions
         * - puter.auth.signIn(): Opens a sign-in dialog for the user to authenticate
         *   This is a promise-based function that resolves when authentication is complete
         */
        async function loadFromFolder() {
            try {
                // Check if user is authenticated using Puter's auth API to verify user access
                if (!puter.auth.isSignedIn()) {
                    showStatus('Authentication required. Please sign in to access Puter folders.', 'info');
                    // Require authentication using Puter's auth API to allow user access to cloud storage
                    await puter.auth.signIn();
                }

                showStatus('<div class="loading"><div class="spinner"></div>Please select a folder to load files from...</div>', 'info');
                
                /**
                 * Puter.js Tutorial:
                 * - puter.ui.showDirectoryPicker(): Opens a folder selection dialog
                 *   Returns a promise that resolves with the selected directory object
                 *   The directory object contains properties like path, name, etc.
                 */
                const selectedFolder = await puter.ui.showDirectoryPicker();
                
                showStatus('<div class="loading"><div class="spinner"></div>Loading files from selected folder...</div>', 'info');
                
                /**
                 * Puter.js Tutorial:
                 * - puter.fs.readdir(path): Lists all files and folders in a directory
                 *   Returns a promise that resolves with an array of file/folder objects
                 *   Each object contains metadata like name, path, is_dir, etc.
                 */
                const files = await puter.fs.readdir(selectedFolder.path);
                
                // Filter for HTML, CSS, and JS files
                const validFiles = files.filter(file => {
                    if (file.is_dir) return false;
                    const extension = file.name.split('.').pop().toLowerCase();
                    return ['html', 'css', 'js'].includes(extension);
                });

                if (validFiles.length === 0) {
                    showStatus('No .html, .css, or .js files found in the selected folder.', 'error');
                    return;
                }

                // Load each valid file
                for (const file of validFiles) {
                    const extension = file.name.split('.').pop().toLowerCase();
                    
                    /**
                     * Puter.js Tutorial:
                     * - puter.fs.read(path): Reads file content from Puter cloud storage
                     *   Returns a promise that resolves with a Blob object containing the file data
                     *   The Blob can then be converted to text, ArrayBuffer, etc.
                     */
                    const blob = await puter.fs.read(file.path);
                    const content = await blob.text();
                    
                    uploadedFiles[extension] = {
                        name: file.name,
                        content: content,
                        size: blob.size
                    };
                }

                updateFilesList();
                updateButtons();
                showStatus(`<i class="fas fa-check-circle" style="color: #155724;"></i> Loaded ${validFiles.length} file(s) from folder: "${selectedFolder.path}"`, 'success');

            } catch (error) {
                if (error.message.includes('canceled') || error.message.includes('cancelled')) {
                    showStatus('Folder selection cancelled by user.', 'info');
                } else {
                    showStatus('Error loading folder: ' + error.message, 'error');
                    console.error('Error loading folder:', error);
                }
            }
        }

        // Update files list display
        function updateFilesList() {
            const filesList = document.getElementById('filesList');
            const hasFiles = Object.values(uploadedFiles).some(file => file !== null);

            if (!hasFiles) {
                filesList.classList.add('hidden');
                return;
            }

            filesList.classList.remove('hidden');
            filesList.innerHTML = '';

            Object.entries(uploadedFiles).forEach(([type, file]) => {
                if (file) {
                    const fileItem = document.createElement('div');
                    fileItem.className = 'file-item';
                    fileItem.innerHTML = `
                        <div class="file-info">
                            <span class="file-icon">${fileTypeMap[type].icon}</span>
                            <div class="file-details">
                                <h4>${file.name}</h4>
                                <p>${fileTypeMap[type].name} • ${formatFileSize(file.size)}</p>
                            </div>
                        </div>
                        <button class="remove-btn" onclick="removeFile('${type}')">Remove</button>
                    `;
                    filesList.appendChild(fileItem);
                }
            });
        }

        // Remove a file
        function removeFile(type) {
            uploadedFiles[type] = null;
            updateFilesList();
            updateButtons();
        }

        // Clear all files
        function clearAllFiles() {
            uploadedFiles = { html: null, css: null, js: null };
            updateFilesList();
            updateButtons();
            document.getElementById('outputSection').classList.add('hidden');
            showStatus('All files cleared.', 'info');
        }

        // Update button states
        function updateButtons() {
            const hasFiles = Object.values(uploadedFiles).some(file => file !== null);
            
            document.getElementById('joinCodeBtn').disabled = !hasFiles;
            document.getElementById('clearFilesBtn').disabled = !hasFiles;
            
            // Result buttons
            const resultButtons = ['copyCodeBtn', 'downloadCodeBtn', 'saveToPuterBtn', 'previewCodeBtn'];
            resultButtons.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.disabled = !combinedCode;
            });
        }

        // Join code from uploaded files
        function joinCode() {
            try {
                showStatus('Combining files...', 'info');

                // Start with HTML base or create one
                let htmlContent = '';
                let headContent = '';
                let bodyContent = '';

                if (uploadedFiles.html) {
                    htmlContent = uploadedFiles.html.content;
                    
                    // Extract head and body content
                    const htmlDoc = new DOMParser().parseFromString(htmlContent, 'text/html');
                    const head = htmlDoc.head;
                    const body = htmlDoc.body;
                    
                    if (head) {
                        headContent = head.innerHTML;
                    }
                    if (body) {
                        bodyContent = body.innerHTML;
                    }
                } else {
                    // Create basic HTML structure if no HTML file provided
                    headContent = `    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Combined App</title>`;
                    bodyContent = `    <h1>Welcome to Combined App</h1>
    <p>This HTML was generated by combining your CSS and JavaScript files.</p>`;
                }

                // Build the combined HTML
                let combined = '<!DOCTYPE html>\n<html lang="en">\n<head>\n';
                
                // Add existing head content
                if (headContent) {
                    const lines = headContent.split('\n');
                    for (let line of lines) {
                        const trimmed = line.trim();
                        if (trimmed) {
                            combined += '    ' + trimmed + '\n';
                        }
                    }
                }

                // Add CSS if available
                if (uploadedFiles.css) {
                    combined += '    <style>\n';
                    const cssLines = uploadedFiles.css.content.split('\n');
                    for (let line of cssLines) {
                        combined += '        ' + line + '\n';
                    }
                    combined += '    </style>\n';
                }

                combined += '</head>\n<body>\n';

                // Add body content
                if (bodyContent) {
                    const lines = bodyContent.split('\n');
                    for (let line of lines) {
                        const trimmed = line.trim();
                        if (trimmed) {
                            combined += '    ' + trimmed + '\n';
                        }
                    }
                }

                // Add JavaScript if available
                if (uploadedFiles.js) {
                    combined += '\n    <script>\n';
                    const jsLines = uploadedFiles.js.content.split('\n');
                    for (let line of jsLines) {
                        combined += '        ' + line + '\n';
                    }
                    combined += '    <\/script>\n';
                }

                combined += '</body>\n</html>';

                combinedCode = combined;
                document.getElementById('codeOutput').textContent = combinedCode;
                document.getElementById('outputSection').classList.remove('hidden');
                updateButtons();

                showStatus('<i class="fas fa-check-circle" style="color: #155724;"></i> Files successfully combined into single HTML file!', 'success');

            } catch (error) {
                showStatus('Error combining files: ' + error.message, 'error');
                console.error('Error combining files:', error);
            }
        }

        // Copy combined code to clipboard
        function copyCode() {
            if (!combinedCode) {
                showStatus('No code to copy. Please join files first.', 'error');
                return;
            }

            if (!navigator.clipboard) {
                // Fallback for browsers without clipboard API
                const textArea = document.createElement('textarea');
                textArea.value = combinedCode;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    showStatus('<i class="fas fa-check-circle" style="color: #155724;"></i> Code copied to clipboard!', 'success');
                } catch (err) {
                    showStatus('Failed to copy to clipboard', 'error');
                }
                document.body.removeChild(textArea);
                return;
            }

            navigator.clipboard.writeText(combinedCode).then(() => {
                showStatus('✅ Code copied to clipboard!', 'success');
            }).catch(err => {
                console.error('Failed to copy: ', err);
                showStatus('Failed to copy to clipboard', 'error');
            });
        }

        // Preview combined code in modal
        function previewCode() {
            if (!combinedCode) {
                showStatus('No code to preview. Please join files first.', 'error');
                return;
            }

            try {
                // Show the modal
                const modal = document.getElementById('previewModal');
                const iframe = document.getElementById('previewFrame');
                
                // Create a blob URL for the HTML content
                const blob = new Blob([combinedCode], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                
                // Load the HTML into the iframe
                iframe.src = url;
                
                // Show modal
                modal.classList.remove('hidden');
                
                // Clean up the blob URL when modal is closed
                const cleanup = () => {
                    URL.revokeObjectURL(url);
                    iframe.src = 'about:blank';
                };
                
                // Store cleanup function for later use
                modal._cleanup = cleanup;
                
                showStatus('<i class="fas fa-check-circle" style="color: #155724;"></i> Preview opened! You can see your combined code running live.', 'success');

            } catch (error) {
                showStatus('Error opening preview: ' + error.message, 'error');
                console.error('Error opening preview:', error);
            }
        }

        // Close preview modal
        function closePreview() {
            const modal = document.getElementById('previewModal');
            modal.classList.add('hidden');
            
            // Run cleanup if available
            if (modal._cleanup) {
                modal._cleanup();
                modal._cleanup = null;
            }
        }

        // Download combined code as index.html
        function downloadCode() {
            if (!combinedCode) {
                showStatus('No code to download. Please join files first.', 'error');
                return;
            }

            try {
                const blob = new Blob([combinedCode], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'index.html';
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                showStatus('<i class="fas fa-check-circle" style="color: #155724;"></i> index.html downloaded successfully!', 'success');

            } catch (error) {
                showStatus('Error downloading file: ' + error.message, 'error');
                console.error('Error downloading file:', error);
            }
        }

        /**
         * Save combined code to Puter folder
         * 
         * Puter.js Tutorial:
         * - puter.auth.isSignedIn(): Checks if the user is currently authenticated with Puter
         *   This verification is crucial before any write operations to ensure proper permissions
         * - puter.auth.signIn(): Opens a sign-in dialog for the user to authenticate
         *   This is a promise-based function that resolves when authentication is complete
         */
        async function saveToPuter() {
            if (!combinedCode) {
                showStatus('No code to save. Please join files first.', 'error');
                return;
            }

            try {
                // Check if user is authenticated using Puter's auth API to verify user access
                if (!puter.auth.isSignedIn()) {
                    showStatus('Authentication required. Please sign in to save files.', 'info');
                    // Require authentication using Puter's auth API to allow user access to cloud storage
                    await puter.auth.signIn();
                }

                showStatus('<div class="loading"><div class="spinner"></div>Please select a folder to save the combined file...</div>', 'info');
                
                /**
                 * Puter.js Tutorial:
                 * - puter.ui.showDirectoryPicker(): Opens a folder selection dialog
                 *   Returns a promise that resolves with the selected directory object
                 *   The user can navigate through their Puter cloud storage to choose a location
                 */
                const selectedFolder = await puter.ui.showDirectoryPicker();
                
                showStatus('<div class="loading"><div class="spinner"></div>Saving combined file...</div>', 'info');
                
                /**
                 * Puter.js Tutorial:
                 * - puter.fs.write(path, data): Writes data to a file in Puter cloud storage
                 *   The first parameter is the full path including filename
                 *   The second parameter is the data to write (string, Blob, ArrayBuffer, etc.)
                 *   Returns a promise that resolves when the write operation is complete
                 */
                await puter.fs.write(`${selectedFolder.path}/index.html`, combinedCode);
                
                showStatus(`<i class="fas fa-check-circle" style="color: #155724;"></i> Combined file saved successfully to: "${selectedFolder.path}/index.html"`, 'success');

            } catch (error) {
                if (error.message.includes('canceled') || error.message.includes('cancelled')) {
                    showStatus('File save cancelled by user.', 'info');
                } else {
                    showStatus('Error saving file: ' + error.message, 'error');
                    console.error('Error saving file:', error);
                }
            }
        }

        /**
         * Open Code Breaker app in Puter
         * 
         * Puter.js Tutorial:
         * - puter.ui.launchApp(appName): Launches another Puter application within the Puter environment
         *   This creates a seamless experience for users moving between Puter apps
         *   The function takes an app name parameter (usually extracted from the app's URL)
         *   Returns a promise that resolves when the app is launched or rejects if it fails
         *   Always include a fallback for environments where Puter.js isn't available
         */
function openCodeBreaker() {
    // Extract the app name from the URL using the same method as mentioned in the instructions
    const appUrl = 'https://puter.com/app/code-splitter';
    const appName = appUrl.split('/').pop(); // This extracts 'code-splitter'
    
    // Try to launch the app using Puter's UI API to open the code breaker application
    if (typeof puter !== 'undefined' && puter.ui && puter.ui.launchApp) {
        puter.ui.launchApp(appName).catch(() => {
            // Fallback to direct link if launch fails
            window.open('https://puter.com/app/code-splitter', '_blank');
        });
    } else {
        // Fallback to direct link
        window.open('https://puter.com/app/code-splitter', '_blank');
    }
}


/**
 * Load application icon from Puter
 * 
 * Puter.js Tutorial:
 * - puter.apps.get(appName): Retrieves metadata about a Puter application
 *   This includes the app's icon, name, description, and other properties
 *   Takes an app name parameter (usually extracted from the app's URL)
 *   Returns a promise that resolves with the app's metadata
 *   Always include error handling and fallbacks for environments where Puter.js isn't available
 */
async function loadAppIcon() {
    try {
        // Extract the app name from the URL
        const appUrl = 'https://puter.com/app/code-splitter';
        const appName = appUrl.split('/').pop(); // This extracts 'code-splitter'
        
        // Try to get app info using Puter's apps API to fetch the app icon
        if (typeof puter !== 'undefined' && puter.apps && puter.apps.get) {
            const appInfo = await puter.apps.get(appName);
            if (appInfo && appInfo.icon) {
                const iconElement = document.getElementById('appIcon');
                iconElement.innerHTML = `<img src="${appInfo.icon}" alt="Code Breaker Icon">`;
            }
        }
    } catch (error) {
        console.log('Could not load app icon, using fallback emoji');
        // Keep the default emoji icon if API call fails
    }
}

        // Utility function to format file size
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        // Show status message
        function showStatus(message, type) {
            const statusDiv = document.getElementById('statusDiv');
            statusDiv.className = `status ${type}`;
            statusDiv.innerHTML = message;
            statusDiv.classList.remove('hidden');
            
            // Auto-hide after 5 seconds for success messages
            if (type === 'success') {
                setTimeout(() => {
                    statusDiv.classList.add('hidden');
                }, 5000);
            }
        }

        // Initialize the application
        document.addEventListener('DOMContentLoaded', function() {
            // Initialize drag and drop functionality
            initializeDragDrop();

            // Load app icon
            loadAppIcon();

            // App navigation
            document.getElementById('openCodeBreaker').addEventListener('click', function(e) {
                e.preventDefault();
                openCodeBreaker();
            });

            // Action buttons
            document.getElementById('loadFromFolderBtn').addEventListener('click', loadFromFolder);
            document.getElementById('joinCodeBtn').addEventListener('click', joinCode);
            document.getElementById('clearFilesBtn').addEventListener('click', clearAllFiles);

            // Result buttons
            document.getElementById('copyCodeBtn').addEventListener('click', copyCode);
            document.getElementById('previewCodeBtn').addEventListener('click', previewCode);
            document.getElementById('downloadCodeBtn').addEventListener('click', downloadCode);
            document.getElementById('saveToPuterBtn').addEventListener('click', saveToPuter);

            // Modal controls
            document.getElementById('closePreview').addEventListener('click', closePreview);
            
            // Close modal when clicking outside
            document.getElementById('previewModal').addEventListener('click', function(e) {
                if (e.target === this) {
                    closePreview();
                }
            });

            // Close modal with Escape key
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    const modal = document.getElementById('previewModal');
                    if (!modal.classList.contains('hidden')) {
                        closePreview();
                    }
                }
            });

            console.log('HTML5 Code Joiner initialized successfully!');
        });