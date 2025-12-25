import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import './App.css';

const OWNER_MOBILE = '6201530654';
const OWNER_PASSWORD = 'Avinash';
const DEFAULT_RATE_PER_SHIFT = 300;
const LIBRARY_RANGE = 30; // 30 meters

function App() {
  // Auth State
  const [loginType, setLoginType] = useState('owner');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [currentPanel, setCurrentPanel] = useState('login');

  // Data State
  const [studentRecords, setStudentRecords] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [paymentRecords, setPaymentRecords] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [libraryLocation, setLibraryLocation] = useState({ lat: null, lng: null, set: false });
  const [whatsappLink, setWhatsappLink] = useState('');

  // QR Scanner State
  const [scanner, setScanner] = useState(null);
  const scannerRef = useRef(null);

  // Load data from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('libraryData');
    if (stored) {
      const data = JSON.parse(stored);
      setStudentRecords(data.students || []);
      setBookings(data.bookings || []);
      setPaymentRecords(data.payments || []);
      setAttendanceRecords(data.attendance || []);
      setLibraryLocation(data.location || { lat: null, lng: null, set: false });
      setWhatsappLink(data.whatsappLink || '');
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    const data = {
      students: studentRecords,
      bookings,
      payments: paymentRecords,
      attendance: attendanceRecords,
      location: libraryLocation,
      whatsappLink
    };
    localStorage.setItem('libraryData', JSON.stringify(data));
  }, [studentRecords, bookings, paymentRecords, attendanceRecords, libraryLocation, whatsappLink]);

  // Login Handler
  const handleLogin = (mobile, password) => {
    if (loginType === 'owner') {
      if (mobile === OWNER_MOBILE && password === OWNER_PASSWORD) {
        setIsLoggedIn(true);
        setLoggedInUser({ type: 'owner', mobile });
        setCurrentPanel('dashboard');
        return true;
      }
    } else {
      const student = studentRecords.find(s => s.mobileNumber === mobile && s.password === password);
      if (student) {
        setIsLoggedIn(true);
        setLoggedInUser({ type: 'student', mobile, data: student });
        setCurrentPanel('studentDashboard');
        return true;
      }
    }
    return false;
  };

  // Logout Handler
  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoggedInUser(null);
    setCurrentPanel('login');
  };

  // GPS Location Functions
  const getAutoLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // QR Code Generation
  const generateQRCode = async () => {
    if (!libraryLocation.set) {
      alert('Please set GPS location first!');
      return null;
    }
    
    const qrData = JSON.stringify({
      type: 'LibraryAttendance',
      lat: libraryLocation.lat,
      lng: libraryLocation.lng,
      timestamp: Date.now()
    });
    
    try {
      const qrCodeUrl = await QRCode.toDataURL(qrData, { width: 400 });
      return qrCodeUrl;
    } catch (error) {
      console.error('QR Generation Error:', error);
      return null;
    }
  };

  // QR Scanner Handler
  const startQRScanner = async (mobile) => {
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          try {
            const qrData = JSON.parse(decodedText);
            
            if (qrData.type !== 'LibraryAttendance') {
              alert('Invalid QR Code!');
              return;
            }

            // Get current location
            const currentLocation = await getAutoLocation();
            const distance = calculateDistance(
              currentLocation.lat,
              currentLocation.lng,
              qrData.lat,
              qrData.lng
            );

            if (distance > LIBRARY_RANGE) {
              alert(`You are ${Math.round(distance)}m away from the library. You must be within ${LIBRARY_RANGE}m range!`);
              return;
            }

            // Mark attendance
            const today = new Date().toISOString().split('T')[0];
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

            const existingIndex = attendanceRecords.findIndex(r => r.mobile === mobile && r.date === today);
            
            if (existingIndex !== -1) {
              const existing = attendanceRecords[existingIndex];
              const lastEntry = existing.times[existing.times.length - 1];
              
              if (lastEntry.out) {
                // Start new cycle (IN)
                existing.times.push({ in: timeString, out: null });
              } else {
                // Mark OUT
                lastEntry.out = timeString;
              }
              
              const newRecords = [...attendanceRecords];
              newRecords[existingIndex] = existing;
              setAttendanceRecords(newRecords);
            } else {
              // First attendance (IN)
              setAttendanceRecords([...attendanceRecords, {
                mobile,
                date: today,
                times: [{ in: timeString, out: null }]
              }]);
            }

            alert('✅ Attendance marked successfully!');
            html5QrCode.stop();
          } catch (error) {
            alert('Invalid QR Code format!');
          }
        }
      );
      
      setScanner(html5QrCode);
    } catch (err) {
      alert('Camera access denied or not available!');
    }
  };

  // Render Functions
  const renderLogin = () => (
    <div className="login-container">
      <div className="header-text">
        <h2>Library Work</h2>
        <h1>Automate</h1>
      </div>
      
      <div className="tab-buttons">
        <button 
          className={`tab-button ${loginType === 'owner' ? 'active' : ''}`}
          onClick={() => setLoginType('owner')}
        >
          Owner Login
        </button>
        <button 
          className={`tab-button ${loginType === 'student' ? 'active' : ''}`}
          onClick={() => setLoginType('student')}
        >
          Student Login
        </button>
      </div>

      <form onSubmit={(e) => {
        e.preventDefault();
        const mobile = e.target.mobile.value;
        const password = e.target.password.value;
        if (!handleLogin(mobile, password)) {
          alert('Invalid credentials!');
        }
      }}>
        <div className="input-group">
          <i className="fas fa-mobile-alt"></i>
          <input type="text" name="mobile" placeholder="Mobile Number" required />
        </div>
        <div className="input-group">
          <i className="fas fa-lock"></i>
          <input type="password" name="password" placeholder="Password" required />
        </div>
        <button type="submit" className="login-btn-final">
          {loginType === 'owner' ? 'OWNER LOGIN' : 'STUDENT LOGIN'}
        </button>
      </form>
    </div>
  );

  const renderOwnerDashboard = () => (
    <div className="main-panel">
      <div className="welcome-header">
        <h2>Welcome</h2>
        <p>Library Work Automate Dashboard</p>
      </div>

      <div className="button-grid">
        <button className="dashboard-btn" onClick={() => setCurrentPanel('students')}>
          <i className="fas fa-users"></i>
          Students Data
        </button>
        <button className="dashboard-btn" onClick={() => setCurrentPanel('qrLocation')}>
          <i className="fas fa-qrcode"></i>
          QR & LOCATION
        </button>
        <button className="dashboard-btn" onClick={() => setCurrentPanel('attendance')}>
          <i className="fas fa-calendar-check"></i>
          Attendance Log
        </button>
        <button className="dashboard-btn" onClick={() => setCurrentPanel('payments')}>
          <i className="fas fa-wallet"></i>
          Payment Details
        </button>
      </div>

      <button className="logout-btn" onClick={handleLogout}>LOGOUT</button>
    </div>
  );

  const renderQRLocation = () => {
    const [qrImage, setQrImage] = useState(null);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [locationType, setLocationType] = useState(null);
    const [manualLat, setManualLat] = useState('');
    const [manualLng, setManualLng] = useState('');
    const [whatsappInput, setWhatsappInput] = useState(whatsappLink);

    const handleAutoLocation = async () => {
      try {
        const location = await getAutoLocation();
        setLibraryLocation({ ...location, set: true });
        alert(`Location set successfully!\nLat: ${location.lat}\nLng: ${location.lng}`);
        setShowLocationModal(false);
      } catch (error) {
        alert('Failed to get location. Please enable location services.');
      }
    };

    const handleManualLocation = () => {
      const lat = parseFloat(manualLat);
      const lng = parseFloat(manualLng);
      
      if (isNaN(lat) || isNaN(lng)) {
        alert('Please enter valid coordinates!');
        return;
      }
      
      setLibraryLocation({ lat, lng, set: true });
      alert(`Location set successfully!\nLat: ${lat}\nLng: ${lng}`);
      setShowLocationModal(false);
    };

    const handleGenerateQR = async () => {
      const qr = await generateQRCode();
      if (qr) {
        setQrImage(qr);
      }
    };

    const handlePrintQR = () => {
      if (!qrImage) {
        alert('Generate QR code first!');
        return;
      }
      
      const printWindow = window.open('', '', 'width=600,height=600');
      printWindow.document.write(`
        <html>
          <head><title>Library QR Code</title></head>
          <body style="text-align: center; padding: 20px;">
            <h2>Library Attendance QR Code</h2>
            <img src="${qrImage}" style="width: 400px; height: 400px;" />
            <p>Scan within ${LIBRARY_RANGE}m range</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    };

    return (
      <div className="main-panel">
        <div className="welcome-header">
          <h2>QR & GPS Settings</h2>
          <p>Set Library QR Code and Geolocation</p>
        </div>

        {/* WhatsApp Link Section */}
        <div style={{ marginBottom: '30px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
          <h3 style={{ color: '#25D366', marginBottom: '15px' }}>
            <i className="fab fa-whatsapp"></i> WhatsApp Group Link
          </h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="url"
              value={whatsappInput}
              onChange={(e) => setWhatsappInput(e.target.value)}
              placeholder="https://chat.whatsapp.com/..."
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff'
              }}
            />
            <button
              onClick={() => {
                setWhatsappLink(whatsappInput);
                alert('WhatsApp link saved!');
              }}
              style={{
                padding: '12px 24px',
                background: '#25D366',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Save Link
            </button>
          </div>
        </div>

        <div className="button-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          <button className="dashboard-btn" onClick={handleGenerateQR}>
            <i className="fas fa-qrcode"></i>
            Generate/Print QR Code
          </button>
          <button className="dashboard-btn" onClick={() => setShowLocationModal(true)}>
            <i className="fas fa-map-marker-alt"></i>
            Set GPS Location
          </button>
        </div>

        {qrImage && (
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <h3>Generated QR Code</h3>
            <img src={qrImage} alt="QR Code" style={{ maxWidth: '400px', border: '2px solid #fff' }} />
            <br />
            <button onClick={handlePrintQR} className="print-btn" style={{ marginTop: '20px' }}>
              <i className="fas fa-print"></i> Print QR Code
            </button>
          </div>
        )}

        {showLocationModal && (
          <div className="modal-overlay" style={{ display: 'flex' }}>
            <div className="modal-content">
              <div className="modal-header">Set GPS Location</div>
              
              {!locationType && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <button
                    onClick={() => setLocationType('auto')}
                    className="modal-submit-btn"
                  >
                    <i className="fas fa-location-arrow"></i> Auto Location
                  </button>
                  <button
                    onClick={() => setLocationType('manual')}
                    className="modal-submit-btn"
                    style={{ background: 'linear-gradient(45deg, #FF9800, #FFC107)' }}
                  >
                    <i className="fas fa-edit"></i> Manual Fill
                  </button>
                  <button
                    onClick={() => {
                      setShowLocationModal(false);
                      setLocationType(null);
                    }}
                    className="modal-action-btn"
                    style={{ background: 'none', border: '2px solid #00bcd4', color: '#00bcd4' }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {locationType === 'auto' && (
                <div style={{ textAlign: 'center' }}>
                  <p>Click below to get your current location</p>
                  <button onClick={handleAutoLocation} className="modal-submit-btn">
                    <i className="fas fa-crosshairs"></i> Get Location
                  </button>
                </div>
              )}

              {locationType === 'manual' && (
                <div>
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    className="modal-input"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    className="modal-input"
                  />
                  <button onClick={handleManualLocation} className="modal-submit-btn">
                    Save Location
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {libraryLocation.set && (
          <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(76, 175, 80, 0.2)', borderRadius: '10px' }}>
            <h3 style={{ color: '#4CAF50' }}>✓ Location Set</h3>
            <p>Latitude: {libraryLocation.lat}</p>
            <p>Longitude: {libraryLocation.lng}</p>
            <p>Range: {LIBRARY_RANGE} meters</p>
          </div>
        )}

        <div className="action-buttons-footer" style={{ justifyContent: 'flex-start', marginTop: '30px' }}>
          <button className="back-btn" onClick={() => setCurrentPanel('dashboard')}>
            <i className="fas fa-arrow-left"></i> Back
          </button>
        </div>
      </div>
    );
  };

  const renderStudentDashboard = () => {
    const student = loggedInUser?.data;
    const booking = bookings.find(b => b.mobile === student?.mobileNumber);

    return (
      <div className="main-panel">
        <div className="student-welcome-card">
          <div className="welcome-sub-text">Welcome Back</div>
          <div className="student-name-hero">{student?.fullName}</div>
          <div className="seat-badge">
            <i className="fas fa-chair"></i>
            <span>Seat: {booking?.seat || 'N/A'} | Shift: {booking?.shift || 'N/A'}</span>
          </div>
        </div>

        <div className="button-grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
          {whatsappLink && (
            <button
              className="dashboard-btn"
              onClick={() => window.open(whatsappLink, '_blank')}
              style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
            >
              <i className="fab fa-whatsapp"></i>
              WhatsApp Group
            </button>
          )}
          
          <button
            className="dashboard-btn"
            onClick={() => setCurrentPanel('markAttendance')}
            style={{ background: 'linear-gradient(135deg, #17a2b8, #00bcd4)' }}
          >
            <i className="fas fa-camera"></i>
            Mark Attendance
          </button>
          
          <button
            className="dashboard-btn"
            onClick={() => setCurrentPanel('studentHistory')}
            style={{ background: 'linear-gradient(135deg, #ff9800, #ffc107)' }}
          >
            <i className="fas fa-history"></i>
            Attendance History
          </button>
        </div>

        <button className="logout-btn" onClick={handleLogout}>LOGOUT</button>
      </div>
    );
  };

  const renderMarkAttendance = () => (
    <div className="main-panel">
      <div className="welcome-header">
        <h2>Mark Attendance</h2>
        <p>Scan QR Code to mark your attendance</p>
      </div>

      <div id="qr-reader" style={{ width: '100%', maxWidth: '500px', margin: '20px auto' }}></div>

      <button
        className="login-btn-final"
        onClick={() => startQRScanner(loggedInUser.mobile)}
        style={{ marginBottom: '20px' }}
      >
        <i className="fas fa-camera"></i> Start Camera
      </button>

      <div className="action-buttons-footer" style={{ justifyContent: 'flex-start' }}>
        <button className="back-btn" onClick={() => {
          if (scanner) {
            scanner.stop();
            setScanner(null);
          }
          setCurrentPanel('studentDashboard');
        }}>
          <i className="fas fa-arrow-left"></i> Back
        </button>
      </div>
    </div>
  );

  const renderStudentHistory = () => {
    const student = loggedInUser?.data;
    const studentAttendance = attendanceRecords.filter(r => r.mobile === student?.mobileNumber);
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthName = new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
      <div className="main-panel">
        <div className="welcome-header">
          <h2>Attendance History</h2>
          <p>{monthName}</p>
        </div>

        <div style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
          {studentAttendance.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999' }}>No attendance records found</p>
          ) : (
            studentAttendance.map((record, idx) => {
              const date = new Date(record.date);
              const dateStr = date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
              
              return (
                <div key={idx} style={{
                  padding: '15px',
                  marginBottom: '10px',
                  background: 'rgba(76, 175, 80, 0.2)',
                  borderRadius: '8px',
                  borderLeft: '4px solid #4CAF50'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#4CAF50' }}>
                    {dateStr}
                  </div>
                  {record.times.map((time, tidx) => (
                    <div key={tidx} style={{ marginLeft: '10px', marginBottom: '5px' }}>
                      {time.out ? (
                        <span>
                          <i className="fas fa-arrow-right"></i> {time.in} - {time.out}
                        </span>
                      ) : (
                        <span>
                          <i className="fas fa-arrow-right"></i> {time.in} (In Progress)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>

        <div className="action-buttons-footer" style={{ justifyContent: 'flex-start', marginTop: '20px' }}>
          <button className="back-btn" onClick={() => setCurrentPanel('studentDashboard')}>
            <i className="fas fa-arrow-left"></i> Back
          </button>
        </div>
      </div>
    );
  };

  const renderAttendanceLog = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendanceRecords.filter(r => r.date === today);

    return (
      <div className="main-panel">
        <div className="welcome-header">
          <h2>Attendance Log</h2>
          <p>Today's Attendance</p>
        </div>

        <div style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
          {todayAttendance.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999' }}>No attendance marked today</p>
          ) : (
            todayAttendance.map((record, idx) => {
              const student = studentRecords.find(s => s.mobileNumber === record.mobile);
              
              return (
                <div key={idx} style={{
                  padding: '15px',
                  marginBottom: '10px',
                  background: 'rgba(0, 188, 212, 0.1)',
                  borderRadius: '8px',
                  borderLeft: '4px solid #00bcd4'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                    {student?.fullName || record.mobile}
                  </div>
                  {record.times.map((time, tidx) => (
                    <div key={tidx} style={{ marginLeft: '10px', marginBottom: '5px', fontSize: '0.9em' }}>
                      {time.out ? (
                        <span>
                          Cycle {tidx + 1}: {time.in} - {time.out}
                        </span>
                      ) : (
                        <span style={{ color: '#4CAF50' }}>
                          Currently In: {time.in}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>

        <div className="action-buttons-footer" style={{ justifyContent: 'flex-start', marginTop: '20px' }}>
          <button className="back-btn" onClick={() => setCurrentPanel('dashboard')}>
            <i className="fas fa-arrow-left"></i> Back
          </button>
        </div>
      </div>
    );
  };

  // Main Render
  return (
    <div className="App">
      {!isLoggedIn && renderLogin()}
      {isLoggedIn && loggedInUser?.type === 'owner' && currentPanel === 'dashboard' && renderOwnerDashboard()}
      {isLoggedIn && loggedInUser?.type === 'owner' && currentPanel === 'qrLocation' && renderQRLocation()}
      {isLoggedIn && loggedInUser?.type === 'owner' && currentPanel === 'attendance' && renderAttendanceLog()}
      {isLoggedIn && loggedInUser?.type === 'student' && currentPanel === 'studentDashboard' && renderStudentDashboard()}
      {isLoggedIn && loggedInUser?.type === 'student' && currentPanel === 'markAttendance' && renderMarkAttendance()}
      {isLoggedIn && loggedInUser?.type === 'student' && currentPanel === 'studentHistory' && renderStudentHistory()}
    </div>
  );
}

export default App;
