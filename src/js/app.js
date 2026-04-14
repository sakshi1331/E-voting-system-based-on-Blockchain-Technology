App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  apiUrl: 'http://localhost:5000/api',
  accessToken: null,
  student: null,
  electionActive: false,

  init: function () {
    this.checkAuthentication();
  },

  checkAuthentication: function () {
    const token = localStorage.getItem('accessToken');
    const studentData = localStorage.getItem('student');

    if (token && studentData) {
      App.accessToken = token;
      App.student = JSON.parse(studentData);
      App.showMainInterface();
    } else {
      App.showLoginInterface();
    }
  },

  showLoginInterface: function () {
    $('#loginSection').show();
    $('#mainSection').hide();
  },

  showMainInterface: function () {
    $('#loginSection').hide();
    $('#mainSection').show();
    $('#studentName').text(App.student.firstName + ' ' + App.student.lastName);
    $('#studentEmail').text(App.student.email);
    App.initWeb3();
  },

  // Register Form
  register: function () {
    const data = {
      studentId: $('#registerStudentId').val(),
      firstName: $('#registerFirstName').val(),
      lastName: $('#registerLastName').val(),
      email: $('#registerEmail').val(),
      password: $('#registerPassword').val(),
      department: $('#registerDepartment').val(),
      semester: parseInt($('#registerSemester').val())
    };

    $.ajax({
      url: `${App.apiUrl}/auth/register`,
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(data),
      success: function (response) {
        alert('✅ Registration successful!\n\nCheck your email to verify your account.');
        $('#registerForm')[0].reset();
        App.switchToLogin();
      },
      error: function (error) {
        const message = error.responseJSON?.message || 'Unknown error';
        alert('❌ Registration failed:\n' + message);
      }
    });

    return false;
  },

  // Login Form
  login: function () {
    const email = $('#loginEmail').val();
    const password = $('#loginPassword').val();

    $.ajax({
      url: `${App.apiUrl}/auth/login`,
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ email, password }),
      success: function (response) {
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('student', JSON.stringify(response.student));
        App.accessToken = response.accessToken;
        App.student = response.student;
        $('#loginForm')[0].reset();
        App.showMainInterface();
      },
      error: function (error) {
        const message = error.responseJSON?.message || 'Invalid credentials';
        alert('❌ Login failed:\n' + message);
      }
    });

    return false;
  },

  // Switch between register and login
  switchToLogin: function () {
    $('.tab-content').removeClass('active');
    $('#loginTab').addClass('active');
  },

  switchToRegister: function () {
    $('.tab-content').removeClass('active');
    $('#registerTab').addClass('active');
  },

  // Initialize Web3
  initWeb3: function () {
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(App.web3Provider);
    }

    web3.eth.getCoinbase(function (err, account) {
      if (err === null) {
        App.account = account;
        $('#walletAddress').text(account);
        App.checkWalletStatus();
      }
    });
  },

  // Request Wallet Verification
  requestWalletVerification: function () {
    $.ajax({
      url: `${App.apiUrl}/wallet/request-verification`,
      type: 'POST',
      headers: { 'Authorization': `Bearer ${App.accessToken}` },
      contentType: 'application/json',
      data: JSON.stringify({ walletAddress: App.account }),
      success: function (response) {
        alert('✅ Verification message prepared.\n\nPlease sign it with your wallet.');
        App.signWalletMessage(response.verificationData);
      },
      error: function (error) {
        const message = error.responseJSON?.message || 'Failed to request verification';
        alert('❌ Error:\n' + message);
      }
    });
  },

  // Sign Wallet Message
  signWalletMessage: function (verificationData) {
    web3.personal.sign(
      verificationData.message,
      App.account,
      function (err, signature) {
        if (err) {
          alert('❌ Signing failed:\n' + err.message);
          return;
        }
        App.verifyWalletSignature(App.account, signature);
      }
    );
  },

  // Verify Wallet Signature
  verifyWalletSignature: function (walletAddress, signature) {
    $.ajax({
      url: `${App.apiUrl}/wallet/verify-signature`,
      type: 'POST',
      headers: { 'Authorization': `Bearer ${App.accessToken}` },
      contentType: 'application/json',
      data: JSON.stringify({ walletAddress, signature }),
      success: function (response) {
        alert('✅ Wallet verified successfully!');
        App.checkWalletStatus();
      },
      error: function (error) {
        const message = error.responseJSON?.message || 'Signature verification failed';
        alert('❌ Verification failed:\n' + message);
      }
    });
  },

  // Check Wallet Status
  checkWalletStatus: function () {
    $.ajax({
      url: `${App.apiUrl}/wallet/status`,
      type: 'GET',
      headers: { 'Authorization': `Bearer ${App.accessToken}` },
      success: function (response) {
        if (response.walletVerified) {
          $('#walletStatus').html('<span style="color: green; font-weight: bold;">✓ Verified</span>');
          $('#verifyWalletBtn').hide();
          App.loadElectionData();
        } else {
          $('#walletStatus').html('<span style="color: red; font-weight: bold;">✗ Not Verified</span>');
          $('#verifyWalletBtn').show();
        }
      }
    });
  },

  // Load Election Data
  loadElectionData: function () {
    // Get candidates
    $.ajax({
      url: `${App.apiUrl}/voting/candidates`,
      type: 'GET',
      headers: { 'Authorization': `Bearer ${App.accessToken}` },
      success: function (response) {
        App.renderCandidates(response.candidates);
      }
    });

    // Get election status
    $.ajax({
      url: `${App.apiUrl}/voting/election-status`,
      type: 'GET',
      headers: { 'Authorization': `Bearer ${App.accessToken}` },
      success: function (response) {
        App.electionActive = response.electionActive;
        if (App.electionActive) {
          $('#electionStatus').html('<span style="color: green; font-weight: bold;">✓ Active</span>');
        } else {
          $('#electionStatus').html('<span style="color: red; font-weight: bold;">✗ Not Active</span>');
        }
      }
    });

    // Get voting status
    $.ajax({
      url: `${App.apiUrl}/voting/status`,
      type: 'GET',
      headers: { 'Authorization': `Bearer ${App.accessToken}` },
      success: function (response) {
        if (response.hasVoted) {
          $('#voteForm').hide();
          $('#voteStatus').show().html('You have already voted');
        } else if (!response.eligibleToVote) {
          $('#voteForm').hide();
          $('#voteStatus').show().html('Please verify your wallet before voting');
        } else {
          $('#voteForm').show();
          $('#voteStatus').hide();
        }
      }
    });
  },

  // Render Candidates
  renderCandidates: function (candidates) {
    const candidatesResults = $('#candidatesResults');
    const candidatesSelect = $('#candidatesSelect');
    
    candidatesResults.empty();
    candidatesSelect.empty();

    candidates.forEach(function (candidate) {
      const row = `<tr><td>${candidate.id}</td><td>${candidate.name}</td><td>${candidate.voteCount}</td></tr>`;
      candidatesResults.append(row);

      const option = `<option value="${candidate.id}">${candidate.name}</option>`;
      candidatesSelect.append(option);
    });
  },

  // Cast Vote
  castVote: function () {
    const candidateId = $('#candidatesSelect').val();

    $.ajax({
      url: `${App.apiUrl}/voting/cast-vote`,
      type: 'POST',
      headers: { 'Authorization': `Bearer ${App.accessToken}` },
      contentType: 'application/json',
      data: JSON.stringify({ candidateId: parseInt(candidateId) }),
      success: function (response) {
        App.sendBlockchainVote(response.transactionData);
      },
      error: function (error) {
        const message = error.responseJSON?.message || 'Failed to cast vote';
        alert('❌ Error:\n' + message);
      }
    });

    return false;
  },

  // Send Blockchain Vote
  sendBlockchainVote: function (txData) {
    web3.eth.sendTransaction({
      from: App.account,
      to: txData.to,
      data: txData.data,
      gas: 300000
    }, function (err, txHash) {
      if (err) {
        alert('❌ Transaction failed:\n' + err.message);
      } else {
        alert('✅ Vote submitted!\n\nTransaction hash:\n' + txHash);
        setTimeout(() => App.loadElectionData(), 2000);
      }
    });
  },

  // Logout
  logout: function () {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('student');
      App.showLoginInterface();
      $('form').each(function() {
        this.reset();
      });
    }
  }
};

$(function () {
  App.init();
});
