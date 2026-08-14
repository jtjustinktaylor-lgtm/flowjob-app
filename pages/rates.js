// Rates Page — View & Edit Flat Rates and Hourly Rates
Pages.rates = function() {
  const cats = Object.entries(FLAT_RATES);
  const hr = HOURLY_RATES;
  return `
    <div class="page-header"><h2>Rate Compiler</h2><p>View and manage flat rates, hourly rates, and material markup</p></div>
    <div class="grid grid-3" style="margin-bottom:20px">
      <div class="stat-card"><div class="stat-icon" id="rate-icon-std"></div><div><div class="stat-value">$${hr.standard}/hr</div><div class="stat-label">Standard Rate</div></div></div>
      <div class="stat-card"><div class="stat-icon" id="rate-icon-ah"></div><div><div class="stat-value">$${hr.afterHours}/hr</div><div class="stat-label">After Hours</div></div></div>
      <div class="stat-card"><div class="stat-icon" id="rate-icon-hol"></div><div><div class="stat-value">$${hr.holiday}/hr</div><div class="stat-label">Holiday Rate</div></div></div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><h3>Hourly & Service Rates</h3></div>
      <div class="grid grid-2">
        <div class="form-group"><label>Standard ($/hr)</label><input class="form-control" type="number" id="rate-std" value="${hr.standard}"></div>
        <div class="form-group"><label>After Hours ($/hr)</label><input class="form-control" type="number" id="rate-ah" value="${hr.afterHours}"></div>
        <div class="form-group"><label>Holiday ($/hr)</label><input class="form-control" type="number" id="rate-hol" value="${hr.holiday}"></div>
        <div class="form-group"><label>Service Call Fee</label><input class="form-control" type="number" id="rate-sc" value="${hr.serviceCallFee}"></div>
        <div class="form-group"><label>Service Call Waived Over</label><input class="form-control" type="number" id="rate-waive" value="${hr.serviceCallWaivedOver}"></div>
      </div>
      <button class="btn btn-primary" onclick="Rates.saveHourly()">Save Rates</button>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><h3>Material Markup</h3></div>
      <div class="grid grid-2">
        ${Object.entries(MATERIAL_MARKUP.categories).map(([k,v]) => `
          <div class="form-group"><label>${k.charAt(0).toUpperCase()+k.slice(1)} Markup %</label>
            <input class="form-control" type="number" step="1" id="mkp-${k}" value="${Math.round(v*100)}"></div>
        `).join('')}
      </div>
      <button class="btn btn-primary" onclick="Rates.saveMarkup()">Save Markup</button>
    </div>
    <div class="card">
      <div class="card-header">
        <h3>Flat Rate Book</h3>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-outline btn-sm" onclick="Rates.bulkEdit()">📝 Bulk Edit</button>
          <button class="btn btn-outline btn-sm" onclick="Rates.importRates()">📥 Import</button>
          <button class="btn btn-outline btn-sm" onclick="Rates.exportRates()">📤 Export</button>
        </div>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
        <input class="form-control" id="rates-search" placeholder="Search all flat rates..." style="max-width:300px" oninput="Rates._search()">
        <select class="form-control" id="rates-cat-filter" style="max-width:200px" onchange="Rates._search()">
          <option value="">All Categories</option>
          ${cats.map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('')}
        </select>
        <span id="rates-result-count" style="font-size:13px;color:var(--text-muted)"></span>
      </div>
      <div id="rates-search-results" style="display:none;margin-bottom:16px"></div>
      ${cats.map(([key, cat]) => `
        <h4 id="rate-cat-${key}" style="margin:16px 0 8px;color:var(--navy)">${cat.label}</h4>
        <div class="table-wrap"><table id="rate-table-${key}">
          <thead><tr><th>Service</th><th>Price</th><th></th></tr></thead>
          <tbody>${cat.items.map(it => `<tr id="rate-item-${it.id}" class="rate-row" data-cat="${key}" data-desc="${it.desc.toLowerCase()}">
            <td>${it.desc}</td><td>${App.formatCurrency(it.price)}</td>
            <td><button class="btn btn-sm btn-outline" onclick="Rates.editItem('${key}','${it.id}')">Edit</button></td>
          </tr>`).join('')}</tbody>
        </table></div>
      `).join('')}
      <button class="btn btn-outline" style="margin-top:12px" onclick="Rates.addItem()">+ Add Service</button>
    </div>`;
};

const Rates = {
  saveHourly() {
    HOURLY_RATES.standard = parseFloat(document.getElementById('rate-std').value)||95;
    HOURLY_RATES.afterHours = parseFloat(document.getElementById('rate-ah').value)||145;
    HOURLY_RATES.holiday = parseFloat(document.getElementById('rate-hol').value)||175;
    HOURLY_RATES.serviceCallFee = parseFloat(document.getElementById('rate-sc').value)||75;
    HOURLY_RATES.serviceCallWaivedOver = parseFloat(document.getElementById('rate-waive').value)||500;
    App.state.hourlyRates = { ...HOURLY_RATES };
    App.saveState();
    App.toast('Hourly rates saved');
  },
  saveMarkup() {
    Object.keys(MATERIAL_MARKUP.categories).forEach(k => {
      const el = document.getElementById('mkp-'+k);
      if (el) MATERIAL_MARKUP.categories[k] = (parseFloat(el.value)||30)/100;
    });
    App.state.materialMarkup = JSON.parse(JSON.stringify(MATERIAL_MARKUP));
    App.saveState();
    App.toast('Markup rates saved');
  },
  editItem(catKey, itemId) {
    const item = FLAT_RATES[catKey].items.find(i => i.id === itemId);
    if (!item) return;
    App.openModal(`<div class="modal-header"><h3>Edit Rate</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <div class="form-group"><label>Description</label><input class="form-control" id="ri-desc" value="${item.desc}"></div>
      <div class="form-group"><label>Price ($)</label><input class="form-control" type="number" step="0.01" id="ri-price" value="${item.price}"></div>
      <div class="form-group">
        <label>Category</label>
        <select class="form-control" id="ri-cat">
          ${Object.entries(FLAT_RATES).map(([k,v]) => `<option value="${k}" ${k === catKey ? 'selected' : ''}>${v.label}</option>`).join('')}
        </select>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-danger" onclick="Rates._deleteItem('${catKey}','${itemId}')">Delete</button>
        <button class="btn btn-primary" onclick="Rates._saveItem('${catKey}','${itemId}')">Save</button>
      </div>`);
  },
  _saveItem(catKey, itemId) {
    const item = FLAT_RATES[catKey].items.find(i => i.id === itemId);
    const newDesc = document.getElementById('ri-desc').value;
    const newPrice = parseFloat(document.getElementById('ri-price').value)||0;
    const newCat = document.getElementById('ri-cat').value;
    
    // If category changed, move item
    if (newCat !== catKey) {
      const idx = FLAT_RATES[catKey].items.findIndex(i => i.id === itemId);
      if (idx >= 0) {
        FLAT_RATES[catKey].items.splice(idx, 1);
        FLAT_RATES[newCat].items.push({ id: itemId, desc: newDesc, price: newPrice });
      }
    } else {
      item.desc = newDesc;
      item.price = newPrice;
    }
    
    App.state.flatRates = JSON.parse(JSON.stringify(FLAT_RATES));
    App.saveState();
    App.closeModal(); App.handleRoute(); App.toast('Rate updated');
  },
  _deleteItem(catKey, itemId) {
    if (!confirm('Delete this rate?')) return;
    const idx = FLAT_RATES[catKey].items.findIndex(i => i.id === itemId);
    if (idx >= 0) {
      FLAT_RATES[catKey].items.splice(idx, 1);
      App.state.flatRates = JSON.parse(JSON.stringify(FLAT_RATES));
      App.saveState();
      App.closeModal(); App.handleRoute(); App.toast('Rate deleted');
    }
  },
  addItem() {
    const cats = Object.entries(FLAT_RATES);
    App.openModal(`<div class="modal-header"><h3>Add Service</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <div class="form-group"><label>Category</label>
        <select class="form-control" id="ri-cat">${cats.map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}</select></div>
      <div class="form-group"><label>Description</label><input class="form-control" id="ri-desc"></div>
      <div class="form-group"><label>Price ($)</label><input class="form-control" type="number" step="0.01" id="ri-price"></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Rates._addNewItem()">Add</button>
      </div>`);
  },
  _addNewItem() {
    const catKey = document.getElementById('ri-cat').value;
    const desc = document.getElementById('ri-desc').value.trim();
    const price = parseFloat(document.getElementById('ri-price').value)||0;
    if (!desc) return App.toast('Enter a description','error');
    FLAT_RATES[catKey].items.push({ id: App.genId(), desc, price });
    App.state.flatRates = JSON.parse(JSON.stringify(FLAT_RATES));
    App.saveState();
    App.closeModal(); App.handleRoute(); App.toast('Service added');
  },

  // Bulk Edit Mode
  bulkEdit() {
    const cats = Object.entries(FLAT_RATES);
    let html = `<div class="modal-header"><h3>Bulk Edit Rates</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">Edit prices directly in the table. Click "Apply" when done.</p>`;
    
    cats.forEach(([key, cat]) => {
      html += `<h4 style="margin:16px 0 8px;color:var(--navy)">${cat.label}</h4>
        <div class="table-wrap"><table>
          <thead><tr><th>Service</th><th style="width:120px">Price ($)</th></tr></thead>
          <tbody>${cat.items.map(it => `
            <tr>
              <td>${it.desc}</td>
              <td><input class="form-control" type="number" step="0.01" 
                    id="bulk-${it.id}" value="${it.price}" 
                    style="padding:4px 8px;font-size:14px"></td>
            </tr>`).join('')}
          </tbody>
        </table></div>`;
    });
    
    html += `<div class="modal-footer">
      <button class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="Rates._applyBulkEdit()">Apply All Changes</button>
    </div>`;
    
    App.openModal(html);
  },
  _applyBulkEdit() {
    let changed = 0;
    Object.entries(FLAT_RATES).forEach(([catKey, cat]) => {
      cat.items.forEach(item => {
        const el = document.getElementById('bulk-' + item.id);
        if (el) {
          const newPrice = parseFloat(el.value);
          if (!isNaN(newPrice) && newPrice !== item.price) {
            item.price = newPrice;
            changed++;
          }
        }
      });
    });
    
    if (changed > 0) {
      App.state.flatRates = JSON.parse(JSON.stringify(FLAT_RATES));
      App.saveState();
      App.closeModal(); App.handleRoute();
      App.toast(`Updated ${changed} rate${changed !== 1 ? 's' : ''}`);
    } else {
      App.toast('No changes made', 'info');
    }
  },

  // Import/Export
  exportRates() {
    const data = {
      hourlyRates: HOURLY_RATES,
      materialMarkup: MATERIAL_MARKUP,
      flatRates: FLAT_RATES,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowjob-rates-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    App.toast('Rates exported');
  },
  importRates() {
    App.openModal(`<div class="modal-header"><h3>Import Rates</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">Import rates from a JSON file. This will replace all current rates.</p>
      <div class="form-group">
        <label>Select File</label>
        <input class="form-control" type="file" id="import-file" accept=".json">
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Rates._processImport()">Import</button>
      </div>`);
  },
  _processImport() {
    const fileInput = document.getElementById('import-file');
    if (!fileInput.files.length) return App.toast('Select a file', 'error');
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = JSON.parse(e.target.result);
        
        if (data.hourlyRates) Object.assign(HOURLY_RATES, data.hourlyRates);
        if (data.materialMarkup) Object.assign(MATERIAL_MARKUP, data.materialMarkup);
        if (data.flatRates) {
          Object.keys(data.flatRates).forEach(key => {
            if (FLAT_RATES[key]) FLAT_RATES[key] = data.flatRates[key];
          });
        }
        
        App.state.hourlyRates = { ...HOURLY_RATES };
        App.state.materialMarkup = JSON.parse(JSON.stringify(MATERIAL_MARKUP));
        App.state.flatRates = JSON.parse(JSON.stringify(FLAT_RATES));
        App.saveState();
        
        App.closeModal(); App.handleRoute();
        App.toast('Rates imported successfully');
      } catch (err) {
        App.toast('Invalid file format', 'error');
      }
    };
    reader.readAsText(file);
  },

  _search() {
    const query = (document.getElementById('rates-search')?.value || '').toLowerCase().trim();
    const catFilter = document.getElementById('rates-cat-filter')?.value || '';
    const resultsDiv = document.getElementById('rates-search-results');
    const countSpan = document.getElementById('rates-result-count');

    // Show/hide category headers and rows based on category filter
    Object.keys(FLAT_RATES).forEach(key => {
      const catHeader = document.getElementById('rate-cat-' + key);
      const catTable = document.getElementById('rate-table-' + key);
      if (catHeader) catHeader.style.display = (!catFilter || catFilter === key) ? '' : 'none';
      if (catTable) catTable.parentElement.style.display = (!catFilter || catFilter === key) ? '' : 'none';
    });

    if (!query && !catFilter) {
      resultsDiv.style.display = 'none';
      if (countSpan) countSpan.textContent = '';
      // Show all rows
      document.querySelectorAll('.rate-row').forEach(r => r.style.display = '');
      return;
    }

    // Filter rows by text match
    let matchCount = 0;
    document.querySelectorAll('.rate-row').forEach(row => {
      const desc = row.dataset.desc || '';
      const cat = row.dataset.cat || '';
      const catMatch = !catFilter || catFilter === cat;
      const textMatch = !query || desc.includes(query);
      const show = catMatch && textMatch;
      row.style.display = show ? '' : 'none';
      if (show) matchCount++;
    });

    if (countSpan) countSpan.textContent = matchCount + ' result' + (matchCount !== 1 ? 's' : '') + ' found';

    // Show search results dropdown if there's a text query
    if (query) {
      const matches = [];
      Object.entries(FLAT_RATES).forEach(([catKey, cat]) => {
        if (catFilter && catFilter !== catKey) return;
        cat.items.forEach(item => {
          if (item.desc.toLowerCase().includes(query)) {
            matches.push({ catKey, catLabel: cat.label, item });
          }
        });
      });

      if (matches.length > 0 && matches.length <= 20) {
        resultsDiv.style.display = 'block';
        resultsDiv.innerHTML = `<div class="table-wrap"><table>
          <thead><tr><th>Category</th><th>Service</th><th>Price</th><th></th></tr></thead>
          <tbody>${matches.map(m => `<tr style="cursor:pointer" onclick="Rates._scrollToItem('${m.catKey}','${m.item.id}')">
            <td><span class="badge badge-info">${m.catLabel}</span></td>
            <td>${m.item.desc}</td>
            <td>${App.formatCurrency(m.item.price)}</td>
            <td><button class="btn btn-sm btn-outline" onclick="event.stopPropagation();Rates.editItem('${m.catKey}','${m.item.id}')">Edit</button></td>
          </tr>`).join('')}</tbody></table></div>`;
      } else if (matches.length > 20) {
        resultsDiv.style.display = 'block';
        resultsDiv.innerHTML = `<p style="color:var(--text-muted);font-size:13px">${matches.length} matches — keep typing to narrow down</p>`;
      } else {
        resultsDiv.style.display = 'block';
        resultsDiv.innerHTML = `<p style="color:var(--text-muted);font-size:13px">No matches found for "${App.escapeHtml(query)}"</p>`;
      }
    } else {
      resultsDiv.style.display = 'none';
    }
  },

  _scrollToItem(catKey, itemId) {
    // Hide search results
    const resultsDiv = document.getElementById('rates-search-results');
    if (resultsDiv) resultsDiv.style.display = 'none';

    // Scroll to the category header
    const catHeader = document.getElementById('rate-cat-' + catKey);
    if (catHeader) catHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Highlight the specific row
    const row = document.getElementById('rate-item-' + itemId);
    if (row) {
      row.style.display = '';
      row.style.background = 'var(--gold-light)';
      row.style.transition = 'background 0.3s';
      setTimeout(() => { row.style.background = ''; }, 2000);
    }
  }
};
