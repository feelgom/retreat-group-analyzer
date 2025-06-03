let chartInstances = [];
        let isSampleMode = false; // 샘플 데이터 모드 플래그
        
        // 구글 시트 CSV URL
        const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/133kd0RK7ye_M0BsCwb6occ8SFVEvXXN_/export?format=csv&gid=1530529588';

        // 마지막 업데이트 시간 표시 함수
        function updateLastUpdatedTime() {
            const now = new Date();
            const timeString = now.toLocaleString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const lastUpdatedElement = document.querySelector('.last-updated');
            if (lastUpdatedElement) {
                if (isSampleMode) {
                    lastUpdatedElement.innerHTML = `<strong>샘플 데이터 로드 시간:</strong> ${timeString}`;
                } else {
                    lastUpdatedElement.innerHTML = `<strong>마지막 업데이트:</strong> ${timeString}`;
                }
            }
        }

        // 메시지 표시 함수
        function showMessage(message, type = 'info') {
            const messageContainer = document.getElementById('messageContainer');
            const messageClass = type === 'error' ? 'error-message' : 
                                type === 'success' ? 'success-message' : 'loading';
            
            messageContainer.innerHTML = `<div class="${messageClass}">${message}</div>`;
            
            if (type !== 'loading') {
                setTimeout(() => {
                    if (!isSampleMode) { // 샘플 모드가 아닐 때만 메시지 제거
                        messageContainer.innerHTML = '';
                    }
                }, 5000);
            }
        }

        // CORS 오류 시 새로고침 안내 표시
        function showRefreshNotice() {
            const messageContainer = document.getElementById('messageContainer');
            messageContainer.innerHTML = `
                <div class="refresh-notice">
                    <h3>🚫 데이터 접근 제한</h3>
                    <p>보안 정책(CORS)으로 인해 구글 시트 데이터에 접근할 수 없습니다.</p>
                    <p><strong>페이지를 새로고침</strong>하거나 잠시 후 다시 시도해주세요.</p>
                    <button class="refresh-guide-btn" onclick="location.reload()">
                        🔄 페이지 새로고침
                    </button>
                </div>
            `;
        }

        // 샘플 데이터 경고 표시
        function showSampleWarning() {
            const messageContainer = document.getElementById('messageContainer');
            messageContainer.innerHTML = `
                <div class="sample-warning">
                    <h3>⚠️ 샘플 데이터 모드</h3>
                    <p>현재 표시되는 데이터는 <strong>샘플 데이터</strong>입니다.</p>
                    <p>실제 수련회 데이터를 보려면 위의 <strong>"데이터 새로고침"</strong> 버튼을 클릭하거나 페이지를 새로고침해주세요.</p>
                </div>
            `;
        }

        // 샘플 모드 UI 적용/제거
        function toggleSampleMode(enable) {
            const container = document.querySelector('.container');
            if (enable) {
                container.classList.add('sample-mode');
                isSampleMode = true;
                showSampleWarning();
            } else {
                container.classList.remove('sample-mode');
                isSampleMode = false;
                document.getElementById('messageContainer').innerHTML = '';
            }
        }

        // 구글 시트에서 데이터 가져오기 (JSONP 방식)
        async function loadGoogleSheetData() {
            try {
                // 샘플 모드 해제
                toggleSampleMode(false);
                
                showMessage('🔄 구글 시트에서 데이터를 가져오는 중...', 'loading');
                
                // 캐시 무효화를 위한 타임스탬프 추가
                const timestamp = new Date().getTime();
                const cacheBuster = `&_=${timestamp}&random=${Math.random()}`;
                const googleSheetUrlWithCacheBuster = GOOGLE_SHEET_URL + cacheBuster;
                
                // CORS 프록시를 사용하여 데이터 가져오기
                const proxyUrl = 'https://api.allorigins.win/raw?url=';
                const targetUrl = encodeURIComponent(googleSheetUrlWithCacheBuster);
                
                console.log('요청 URL:', proxyUrl + targetUrl);
                
                const response = await fetch(proxyUrl + targetUrl, {
                    method: 'GET',
                    cache: 'no-cache'  // 브라우저 캐시 무시
                });
                
                // 응답 헤더 정보 로깅
                console.log('Response Headers:');
                for (let [key, value] of response.headers.entries()) {
                    console.log(`${key}: ${value}`);
                }
                
                console.log('Response status:', response.status);
                console.log('Response ok:', response.ok);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const csvText = await response.text();
                console.log('CSV 데이터 길이:', csvText.length);
                console.log('CSV 첫 200자:', csvText.substring(0, 200));
                
                // CSV 데이터가 올바른지 확인
                if (!csvText || csvText.trim() === '') {
                    throw new Error('빈 데이터를 받았습니다.');
                }
                
                // 응답 헤더에서 마지막 수정 시간 추출
                const lastModified = response.headers.get('last-modified');
                const etag = response.headers.get('etag');
                const cacheControl = response.headers.get('cache-control');
                
                console.log('Last-Modified:', lastModified);
                console.log('ETag:', etag);
                console.log('Cache-Control:', cacheControl);
                
                processCSVData(csvText);
                
                // 성공 메시지에 헤더 정보 포함
                let successMessage = '✅ 구글 시트 데이터를 성공적으로 불러왔습니다!';
                if (lastModified) {
                    const modifiedDate = new Date(lastModified);
                    successMessage += `<br>📅 시트 수정 시간: ${modifiedDate.toLocaleString('ko-KR')}`;
                }
                
                showMessage(successMessage, 'success');
                updateLastUpdatedTime();
                
            } catch (error) {
                console.error('구글 시트 데이터 로딩 오류:', error);
                
                // 다른 방법으로 시도
                tryAlternativeMethod();
            }
        }

        // 대안 방법 시도
        async function tryAlternativeMethod() {
            try {
                showMessage('🔄 다른 방법으로 데이터를 가져오는 중...', 'loading');
                
                // 캐시 무효화를 위한 타임스탬프 추가
                const timestamp = new Date().getTime();
                const cacheBuster = `&_=${timestamp}&random=${Math.random()}`;
                const googleSheetUrlWithCacheBuster = GOOGLE_SHEET_URL + cacheBuster;
                
                // 다른 CORS 프록시 시도
                const corsProxy = 'https://cors-anywhere.herokuapp.com/';
                const response = await fetch(corsProxy + googleSheetUrlWithCacheBuster, {
                    method: 'GET',
                    cache: 'no-cache'
                });
                
                console.log('Alternative method - Response Headers:');
                for (let [key, value] of response.headers.entries()) {
                    console.log(`${key}: ${value}`);
                }
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const csvText = await response.text();
                console.log('Alternative method - CSV 데이터 길이:', csvText.length);
                
                processCSVData(csvText);
                
                // 응답 헤더에서 마지막 수정 시간 추출
                const lastModified = response.headers.get('last-modified');
                let successMessage = '✅ 구글 시트 데이터를 성공적으로 불러왔습니다!';
                if (lastModified) {
                    const modifiedDate = new Date(lastModified);
                    successMessage += `<br>📅 시트 수정 시간: ${modifiedDate.toLocaleString('ko-KR')}`;
                }
                
                showMessage(successMessage, 'success');
                updateLastUpdatedTime();
                
            } catch (error) {
                console.error('대안 방법도 실패:', error);
                
                // CORS 오류 안내 및 새로고침 권장
                showRefreshNotice();
                
                // 3초 후 샘플 데이터로 전환
                setTimeout(() => {
                    toggleSampleMode(true);
                    loadSampleData();
                }, 3000);
            }
        }

        // CSV 데이터 처리 함수
        function processCSVData(csvText) {
            try {
                const lines = csvText.split('\n').filter(line => line.trim());
                const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                
                // 컬럼 인덱스 찾기
                const groupIndex = headers.findIndex(h => h.includes('조') || h.includes('편성'));
                const nameIndex = headers.findIndex(h => h.includes('이름'));
                const birthIndex = headers.findIndex(h => h.includes('생년월일') || h.includes('생일'));
                const genderIndex = headers.findIndex(h => h.includes('성별'));
                
                if (groupIndex === -1 || nameIndex === -1 || birthIndex === -1) {
                    throw new Error('필요한 컬럼(조편성, 이름, 생년월일)을 찾을 수 없습니다.');
                }

                // 데이터 파싱
                const data = [];
                for (let i = 1; i < lines.length; i++) {
                    const values = parseCSVLine(lines[i]);
                    if (values.length >= Math.max(groupIndex, nameIndex, birthIndex, genderIndex) + 1) {
                        const groupValue = values[groupIndex];
                        const birthValue = values[birthIndex];
                        
                        // 빈 데이터나 잘못된 데이터 필터링
                        if (groupValue && birthValue && values[nameIndex]) {
                            data.push({
                                group: parseInt(groupValue) || groupValue,
                                name: values[nameIndex],
                                birthDate: birthValue,
                                gender: genderIndex >= 0 ? values[genderIndex] : '미상'
                            });
                        }
                    }
                }

                createChartsFromData(data);

            } catch (error) {
                console.error('CSV 데이터 처리 오류:', error);
                showMessage('❌ 데이터 처리 중 오류가 발생했습니다: ' + error.message, 'error');
            }
        }

        // CSV 라인 파싱 (쉼표와 따옴표 처리)
        function parseCSVLine(line) {
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim().replace(/"/g, ''));
                    current = '';
                } else {
                    current += char;
                }
            }
            
            result.push(current.trim().replace(/"/g, ''));
            return result;
        }

        // 데이터로부터 차트 생성
        function createChartsFromData(data) {
            // 기존 차트 제거
            chartInstances.forEach(chart => chart.destroy());
            chartInstances = [];
            document.getElementById('chartsContainer').innerHTML = '';

            // 전체 통계 업데이트
            updateOverallStats(data);

            // 조별로 데이터 그룹화
            const groups = {};
            data.forEach(person => {
                if (!groups[person.group]) {
                    groups[person.group] = [];
                }
                groups[person.group].push(person);
            });

            // 각 조별로 차트 생성
            Object.keys(groups).sort((a, b) => {
                const numA = parseInt(a);
                const numB = parseInt(b);
                if (!isNaN(numA) && !isNaN(numB)) {
                    return numA - numB;
                }
                return a.localeCompare(b);
            }).forEach(groupNumber => {
                createChart(groups[groupNumber], groupNumber);
            });
        }

        // 전체 통계 업데이트 함수
        function updateOverallStats(data) {
            const statsContainer = document.getElementById('overallStats');
            
            if (!data || data.length === 0) {
                statsContainer.style.display = 'none';
                return;
            }

            // 통계 섹션 표시
            statsContainer.style.display = 'block';

            // 전체 인원
            const totalPeople = data.length;

            // 성별 분포
            const maleCount = data.filter(person => person.gender === '남').length;
            const femaleCount = data.filter(person => person.gender === '여').length;

            // 나이 계산
            const ages = data.map(person => calculateAge(person.birthDate)).filter(age => !isNaN(age));
            const avgAge = ages.length > 0 ? (ages.reduce((sum, age) => sum + age, 0) / ages.length) : 0;

            // 조 개수
            const groupCount = new Set(data.map(person => person.group)).size;

            // DOM 업데이트
            const statItems = statsContainer.querySelectorAll('.stat-item');
            
            // 전체 인원
            statItems[0].querySelector('.stat-number').textContent = totalPeople;
            statItems[0].querySelector('.stat-detail').textContent = `${groupCount}개 조`;

            // 남성
            statItems[1].querySelector('.stat-number').textContent = maleCount;
            statItems[1].querySelector('.stat-detail').textContent = `${((maleCount / totalPeople) * 100).toFixed(1)}%`;

            // 여성
            statItems[2].querySelector('.stat-number').textContent = femaleCount;
            statItems[2].querySelector('.stat-detail').textContent = `${((femaleCount / totalPeople) * 100).toFixed(1)}%`;

            // 평균 나이
            statItems[3].querySelector('.stat-number').textContent = avgAge.toFixed(1);
            statItems[3].querySelector('.stat-detail').textContent = '세';
        }

        // 나이 계산 함수 (한국나이)
        function calculateAge(birthDate) {
            const today = new Date();
            const birth = new Date(birthDate);
            // 한국나이: 현재 년도 - 태어난 년도 + 1
            return today.getFullYear() - birth.getFullYear() + 1;
        }

        // 차트 색상 팔레트
        const colorPalette = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
        ];

        // PDF 다운로드 함수
        function downloadPDF() {
            const container = document.querySelector('.container');
            const { jsPDF } = window.jspdf;
            
            // PDF 저장 버튼 임시 숨김
            const pdfBtn = document.querySelector('.pdf-btn');
            const refreshBtn = document.querySelector('.refresh-btn');
            pdfBtn.style.display = 'none';
            refreshBtn.style.display = 'none';
            
            html2canvas(container, {
                scale: 1,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff'
            }).then(canvas => {
                const imgData = canvas.toDataURL('image/jpeg', 0.7);
                const pdf = new jsPDF('p', 'mm', 'a4');
                
                const imgWidth = 210;
                const pageHeight = 295;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                let heightLeft = imgHeight;
                
                let position = 0;
                
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
                
                while (heightLeft >= 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }
                
                pdf.save('수련회_조별_나이분포.pdf');
                
                // 버튼 다시 표시
                pdfBtn.style.display = 'inline-block';
                refreshBtn.style.display = 'inline-block';
            }).catch(error => {
                console.error('PDF 생성 오류:', error);
                alert('PDF 생성 중 오류가 발생했습니다.');
                pdfBtn.style.display = 'inline-block';
                refreshBtn.style.display = 'inline-block';
            });
        }

        // 차트 생성 함수
        function createChart(groupData, groupNumber) {
            const container = document.getElementById('chartsContainer');
            
            // 차트 컨테이너 생성
            const chartItem = document.createElement('div');
            chartItem.className = 'chart-item';
            chartItem.innerHTML = `
                <div class="chart-title">${groupNumber}조 (총 ${groupData.length}명)</div>
                <canvas id="chart${groupNumber}"></canvas>
                <div class="stats" id="stats${groupNumber}"></div>
            `;
            container.appendChild(chartItem);

            // Calculate male/female ratio and apply class if needed
            const maleMembers = groupData.filter(person => person.gender === '남').length;
            const femaleMembers = groupData.filter(person => person.gender === '여').length;
            const totalMembers = groupData.length;

            if (totalMembers > 0) {
                const maleProportion = maleMembers / totalMembers;
                if (maleProportion < 0.3 || maleProportion > 0.7) {
                    chartItem.classList.add('highlight-ratio');
                }
            }

            // 나이 데이터 처리
            const ages = groupData.map(person => calculateAge(person.birthDate));

            // 20세부터 4살 간격 라벨 (43세까지)
            const labels = [];
            for (let i = 20; i < 44; i += 4) {
                labels.push(`${i}~${i+3}세`);
            }
            labels.push('44세 이상');

            // 연령대별 카운트
            const ageGroups = {};
            labels.forEach(label => ageGroups[label] = 0);
            ages.forEach(age => {
                if (age < 20) return;
                if (age >= 44) {
                    ageGroups['44세 이상'] += 1;
                } else {
                    const idx = Math.floor((age - 20) / 4);
                    if (idx >= 0 && idx < labels.length - 1) {
                        ageGroups[labels[idx]] += 1;
                    }
                }
            });
            const data = labels.map(label => ageGroups[label]);

            // Y축 최대값 동적 계산 (기본 4, 데이터 최대값이 5 이상이면 그에 맞춰 조정)
            const maxDataValue = Math.max(...data);
            const yAxisMax = maxDataValue >= 5 ? Math.ceil(maxDataValue / 5) * 5 : 4;

            // 차트 생성
            const ctx = document.getElementById(`chart${groupNumber}`).getContext('2d');
            const chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '인원 수',
                        data: data,
                        backgroundColor: colorPalette[groupNumber % colorPalette.length] + '80',
                        borderColor: colorPalette[groupNumber % colorPalette.length],
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.parsed.y}명`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: yAxisMax,
                            ticks: {
                                stepSize: 1
                            },
                            title: {
                                display: true,
                                text: '인원 수'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: '연령대'
                            }
                        }
                    }
                }
            });
            
            chartInstances.push(chart);

            // 통계 정보 표시
            const avgAge = (ages.reduce((sum, age) => sum + age, 0) / ages.length).toFixed(1);
            const minAge = Math.min(...ages);
            const maxAge = Math.max(...ages);
            
            document.getElementById(`stats${groupNumber}`).innerHTML = `
                <strong>📊 통계 정보:</strong><br>
                평균 나이: ${avgAge}세 | 최연소: ${minAge}세 | 최연장: ${maxAge}세<br>
                남성: ${groupData.filter(p => p.gender === '남').length}명 | 
                여성: ${groupData.filter(p => p.gender === '여').length}명
            `;
        }

        // 샘플 데이터로 시작
        function loadSampleData() {
            // 샘플 모드 활성화 (이미 활성화되어 있지 않다면)
            if (!isSampleMode) {
                toggleSampleMode(true);
            }
            
            // 샘플 데이터 생성 (실제 데이터를 업로드하면 대체됩니다)
            const sampleData = [];
            const groups = [1, 2, 3, 4, 5];
            const birthYears = [1970, 1975, 1980, 1985, 1990, 1995, 2000, 2005];
            const genders = ['남', '여'];
            
            groups.forEach(group => {
                const groupSize = Math.floor(Math.random() * 15) + 10; // 10-24명
                for (let i = 0; i < groupSize; i++) {
                    const birthYear = birthYears[Math.floor(Math.random() * birthYears.length)];
                    const month = Math.floor(Math.random() * 12) + 1;
                    const day = Math.floor(Math.random() * 28) + 1;
                    
                    sampleData.push({
                        group: group,
                        name: `사람${group}-${i+1}`,
                        birthDate: `${birthYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
                        gender: genders[Math.floor(Math.random() * genders.length)]
                    });
                }
            });

            createChartsFromData(sampleData);
            updateLastUpdatedTime();
        }

        // 페이지 로드 시 구글 시트 데이터 가져오기
        window.addEventListener('load', function() {
            // 먼저 구글 시트에서 데이터를 가져오려고 시도
            loadGoogleSheetData();
        });
