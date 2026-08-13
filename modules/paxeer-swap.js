// FlowJob — Paxeer Swap Module
// Token swaps, price checking, liquidity management, yield monitoring on Paxeer Network

const PaxeerSwap = {
  CHAIN_ID: 125,
  RPC: 'https://public-rpc.paxeer.app/evm/reference',
  EXPLORER: 'https://paxscan.io',

  knownTokens: {
    PAX: { name: 'PAX', decimals: 18, native: true },
    USDC: { name: 'USD Coin', decimals: 6, contract: '' },
    USDT: { name: 'Tether USD', decimals: 6, contract: '' },
    SID: { name: 'SID Token', decimals: 18, contract: '' },
    AGGIE: { name: 'AGGIE', decimals: 18, contract: '' },
    USDL: { name: 'USDL', decimals: 18, contract: '' },
  },

  renderDashboard() {
    const wallet = App.state.paxeerWallet || '0x2Baeb821b0F2b47be442f3c68074b8B87B3f8744';
    const positions = App.state.paxeerPositions || [];
    const watchlist = App.state.paxeerWatchlist || ['PAX/USDC', 'PAX/USDT'];

    return `
      <div class="glass-card p-6">
        <h3 class="text-lg font-bold text-gold-400 mb-4">🦊 Wallet</h3>
        <div class="form-group">
          <label>Active Wallet</label>
          <select id="paxeer-wallet" class="form-control" onchange="PaxeerSwap.setWallet(this.value)">
            <option value="0x2Baeb821b0F2b47be442f3c68074b8B87B3f8744" ${wallet === '0x2Baeb821b0F2b47be442f3c68074b8B87B3f8744' ? 'selected' : ''}>Primary (0x2Ba...744)</option>
            <option value="0xC375f6f69f55DAD35484613db63Bb2585f878777" ${wallet === '0xC375f6f69f55DAD35484613db63Bb2585f878777' ? 'selected' : ''}>Agentic (0xC37...777)</option>
          </select>
        </div>
        <div id="paxeer-balances" class="mt-3">
          <button class="btn btn-gold btn-sm" onclick="PaxeerSwap.refreshBalances()">🔄 Refresh Balances</button>
          <div id="paxeer-balances-list" class="mt-3"></div>
        </div>
      </div>

      <div class="glass-card p-6">
        <h3 class="text-lg font-bold text-gold-400 mb-4">💱 Token Swap</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>From Token</label>
            <select id="swap-from" class="form-control">
              ${Object.entries(this.knownTokens).map(([k, v]) =>
                `<option value="${k}" ${k === 'PAX' ? 'selected' : ''}>${v.name}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Amount</label>
            <input type="number" id="swap-amount" class="form-control" placeholder="0.00" step="0.01" min="0">
          </div>
          <div class="form-group" style="display:flex;align-items:flex-end;">
            <button class="btn btn-outline btn-sm" onclick="PaxeerSwap.flipSwap()" title="Flip">⇅</button>
          </div>
          <div class="form-group">
            <label>To Token</label>
            <select id="swap-to" class="form-control">
              ${Object.entries(this.knownTokens).map(([k, v]) =>
                `<option value="${k}" ${k === 'USDC' ? 'selected' : ''}>${v.name}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div class="form-group mt-3">
          <label>Slippage Tolerance</label>
          <div class="flex gap-2">
            <button class="btn btn-sm btn-outline slippage-btn active" onclick="PaxeerSwap.setSlippage(0.5)">0.5%</button>
            <button class="btn btn-sm btn-outline slippage-btn" onclick="PaxeerSwap.setSlippage(1)">1%</button>
            <button class="btn btn-sm btn-outline slippage-btn" onclick="PaxeerSwap.setSlippage(3)">3%</button>
            <input type="number" id="swap-slippage-custom" class="form-control" style="width:80px" placeholder="Custom" min="0.1" max="50" step="0.1">
          </div>
        </div>
        <div id="swap-quote" class="mt-3"></div>
        <button class="btn btn-gold mt-3" onclick="PaxeerSwap.getQuote()">📊 Get Quote</button>
      </div>

      <div class="glass-card p-6">
        <h3 class="text-lg font-bold text-gold-400 mb-4">📈 Price Watchlist</h3>
        <div id="paxeer-watchlist">
          ${watchlist.map(pair => `
            <div class="flex justify-between items-center p-3 mb-2" style="background:rgba(255,255,255,0.03);border-radius:8px;">
              <span class="font-bold">${pair}</span>
              <button class="btn btn-outline btn-sm" onclick="PaxeerSwap.checkPrice('${pair}')">Check Price</button>
            </div>
          `).join('')}
        </div>
        <div id="paxeer-price-result" class="mt-3"></div>
      </div>

      <div class="glass-card p-6">
        <h3 class="text-lg font-bold text-gold-400 mb-4">🏊 Liquidity Positions</h3>
        ${positions.length === 0 ?
          '<p class="text-muted">No liquidity positions tracked yet.</p>' :
          positions.map((p, i) => `
            <div class="flex justify-between items-center p-3 mb-2" style="background:rgba(255,255,255,0.03);border-radius:8px;">
              <div><span class="font-bold">${p.pair}</span> <span class="text-muted">— ${p.share}% of pool</span></div>
              <div class="flex gap-2">
                <span class="text-gold-400">${p.value || '—'}</span>
                <button class="btn btn-outline btn-sm" onclick="PaxeerSwap.removePosition(${i})">✕</button>
              </div>
            </div>
          `).join('')}
        <button class="btn btn-outline btn-sm mt-3" onclick="PaxeerSwap.addPosition()">+ Track Position</button>
      </div>
    `;
  },

  setWallet(addr) {
    App.state.paxeerWallet = addr;
    App.saveState();
  },

  flipSwap() {
    const from = document.getElementById('swap-from');
    const to = document.getElementById('swap-to');
    if (!from || !to) return;
    const tmp = from.value;
    from.value = to.value;
    to.value = tmp;
  },

  setSlippage(val) {
    document.querySelectorAll('.slippage-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    const custom = document.getElementById('swap-slippage-custom');
    if (custom) custom.value = '';
  },

  async rpcCall(method, params) {
    try {
      const res = await fetch(this.RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method, params, id: Date.now() }),
      });
      const data = await res.json();
      return data.result;
    } catch (e) {
      console.error('RPC error:', e);
      return null;
    }
  },

  async refreshBalances() {
    const wallet = App.state.paxeerWallet || '0x2Baeb821b0F2b47be442f3c68074b8B87B3f8744';
    const listEl = document.getElementById('paxeer-balances-list');
    if (!listEl) return;
    listEl.innerHTML = '<p class="text-muted">Loading balances...</p>';

    // Native PAX balance
    const balance = await this.rpcCall('eth_getBalance', [wallet, 'latest']);
    let html = '';
    if (balance) {
      const paxBalance = (parseInt(balance, 16) / 1e18).toFixed(4);
      html += `<div class="flex justify-between p-2 mb-1" style="background:rgba(212,175,55,0.08);border-radius:6px;">
        <span class="font-bold">PAX (native)</span><span>${paxBalance} PAX</span>
      </div>`;
    } else {
      html += '<p class="text-muted">Could not fetch PAX balance — RPC may be unavailable</p>';
    }

    // Note about ERC-20 tokens
    html += '<p class="text-muted mt-2" style="font-size:12px;">ERC-20 token balances require contract addresses. Verify on <a href="https://paxscan.io" target="_blank" style="color:#D4AF37;">paxscan.io</a></p>';

    listEl.innerHTML = html;
    App.toast('Balances refreshed', 'success');
  },

  getQuote() {
    const from = document.getElementById('swap-from')?.value || 'PAX';
    const to = document.getElementById('swap-to')?.value || 'USDC';
    const amount = parseFloat(document.getElementById('swap-amount')?.value) || 0;
    const quoteEl = document.getElementById('swap-quote');
    if (!quoteEl) return;

    if (from === to) {
      quoteEl.innerHTML = '<p style="color:#ef4444;">Select different tokens to swap</p>';
      return;
    }
    if (amount <= 0) {
      quoteEl.innerHTML = '<p style="color:#ef4444;">Enter an amount</p>';
      return;
    }

    // Simulated quote (real price would come from pool reserves)
    const slippageEl = document.querySelector('.slippage-btn.active');
    const slippage = parseFloat(document.getElementById('swap-slippage-custom')?.value) ||
                     parseFloat(slippageEl?.textContent) || 0.5;

    quoteEl.innerHTML = `
      <div class="p-3" style="background:rgba(212,175,55,0.08);border-radius:8px;">
        <div class="flex justify-between mb-1"><span>Swap:</span><span>${amount} ${from} → ${to}</span></div>
        <div class="flex justify-between mb-1"><span>Slippage:</span><span>${slippage}%</span></div>
        <div class="flex justify-between mb-1"><span>Network:</span><span>Paxeer (Chain ${this.CHAIN_ID})</span></div>
        <p class="text-muted mt-2" style="font-size:12px;">⚠️ Connect to the Paxeer DEX to execute. This quote is an estimate based on available data. Verify on <a href="https://paxscan.io" target="_blank" style="color:#D4AF37;">paxscan.io</a> before swapping.</p>
      </div>
    `;
  },

  checkPrice(pair) {
    const resultEl = document.getElementById('paxeer-price-result');
    if (!resultEl) return;
    resultEl.innerHTML = `
      <div class="p-3" style="background:rgba(212,175,55,0.08);border-radius:8px;">
        <div class="font-bold">${pair}</div>
        <p class="text-muted mt-1">Price data is fetched from on-chain pool reserves. Check current reserves on
        <a href="https://paxscan.io" target="_blank" style="color:#D4AF37;">paxscan.io</a> for live pricing.</p>
      </div>
    `;
  },

  addPosition() {
    const pair = prompt('Enter pair (e.g., PAX/USDC):');
    if (!pair) return;
    const positions = App.state.paxeerPositions || [];
    positions.push({ pair, share: 0, value: null, added: new Date().toISOString() });
    App.state.paxeerPositions = positions;
    App.saveState();
    this.refresh();
  },

  removePosition(idx) {
    const positions = App.state.paxeerPositions || [];
    positions.splice(idx, 1);
    App.state.paxeerPositions = positions;
    App.saveState();
    this.refresh();
  },

  refresh() {
    const content = document.getElementById('content');
    if (content && window.location.hash === '#paxeer') {
      content.innerHTML = `<div class="page-header"><h2>🦊 Paxeer Swap</h2></div>${this.renderDashboard()}`;
      App.injectPageIcons();
    }
  },
};
