// Configuration et données
let clothingItems = [
    {id: 1, name: "T-shirt blanc", category: "haut", season: "toute", style: ["casual", "sport"], emoji: "👕", photo: "", temp: {min: 15, max: 35}},
    {id: 2, name: "Jean slim", category: "bas", season: "toute", style: ["casual", "streetwear"], emoji: "👖", photo: "", temp: {min: 0, max: 25}},
    {id: 3, name: "Sneakers", category: "chaussures", season: "toute", style: ["casual", "streetwear", "sport"], emoji: "👟", photo: "", temp: {min: -10, max: 40}},
    {id: 4, name: "Hoodie", category: "haut", season: "hiver", style: ["casual", "streetwear"], emoji: "👘", photo: "", temp: {min: -5, max: 15}},
    {id: 5, name: "Chemise", category: "haut", season: "toute", style: ["classe"], emoji: "👔", photo: "", temp: {min: 10, max: 30}},
    {id: 6, name: "Pantalon costume", category: "bas", season: "toute", style: ["classe"], emoji: "👖", photo: "", temp: {min: 5, max: 35}},
    {id: 7, name: "Chaussures de ville", category: "chaussures", season: "toute", style: ["classe"], emoji: "👞", photo: "", temp: {min: -5, max: 40}},
    {id: 8, name: "Short", category: "bas", season: "ete", style: ["casual", "sport"], emoji: "🩳", photo: "", temp: {min: 20, max: 40}},
    {id: 9, name: "Manteau", category: "veste", season: "hiver", style: ["classe", "casual"], emoji: "🧥", photo: "", temp: {min: -10, max: 10}},
    {id: 10, name: "Casquette", category: "accessoire", season: "toute", style: ["streetwear", "sport"], emoji: "🧢", photo: "", temp: {min: 15, max: 40}}
];

let savedOutfits = [];
let currentOutfit = [];
let currentWeather = null;
let selectedStyle = "casual";
let availableStyles = ["casual", "streetwear", "classe", "sport"];
const defaultStyles = ["casual", "streetwear", "classe", "sport"];
let lastSavedTimestamp = 0;

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();      // 1️⃣ Charger d’abord les données locales
    loadFromURL();               // 2️⃣ Charger uniquement si ?data= existe
    renderClothingItems();       // 3️⃣ Rendre ce qu’on a en mémoire
    renderSavedOutfits();
    renderManageOutfits();
    setupEventListeners();       // 4️⃣ Brancher les listeners
    getWeather();                // 5️⃣ Météo
});


function setupEventListeners() {
    // Style selector
    document.querySelectorAll('.style-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.style-option').forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            selectedStyle = this.dataset.style;
            saveToLocalStorage();
        });
    });

    // Drag and drop
    const canvas = document.getElementById('outfitCanvas');
    canvas.addEventListener('dragover', handleDragOver);
    canvas.addEventListener('drop', handleDrop);
    canvas.addEventListener('dragleave', handleDragLeave);

    // Enter key for location
    document.getElementById('location').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            getWeather();
        }
    });
}

function renderClothingItems() {
    const categories = [
        {id: 'hautGrid', name: 'Haut'},
        {id: 'basGrid', name: 'Bas'},
        {id: 'chaussuresGrid', name: 'Chaussures'},
        {id: 'accessoireGrid', name: 'Accessoire'},
        {id: 'vesteGrid', name: 'Veste'}
    ];

    categories.forEach(category => {
        const grid = document.getElementById(category.id);
        grid.innerHTML = ``;
        
        const items = clothingItems.filter(item => item.category === category.id.replace('Grid', ''));
        items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'clothing-item';
            itemEl.draggable = true;
            itemEl.dataset.itemId = item.id;
            
            itemEl.innerHTML = `
                ${item.photo ? `<img src="${item.photo}" class="clothing-photo">` : `<span class="clothing-emoji">${item.emoji}</span>`}
                <div style="font-size: 0.8rem; font-weight: 500;">${item.name}</div>
                <div style="font-size: 0.7rem; opacity: 0.7;">${item.category}</div>
                <button class="delete-btn" onclick="deleteClothingItem(${item.id})">×</button>
            `;
            
            itemEl.addEventListener('dragstart', handleDragStart);
            itemEl.addEventListener('dragend', handleDragEnd);
            
            grid.appendChild(itemEl);
        });
    });
}

function deleteClothingItem(itemId) {
    if (confirm('Voulez-vous vraiment supprimer ce vêtement ?')) {
        clothingItems = clothingItems.filter(item => item.id !== itemId);
        // Remove from any saved outfits
        savedOutfits = savedOutfits.map(outfit => ({
            ...outfit,
            items: outfit.items.filter(item => item.id !== itemId),
            tempRange: calculateOutfitTempRange(outfit.items.filter(item => item.id !== itemId))
        }));
        // Remove from current outfit
        currentOutfit = currentOutfit.filter(item => item.id !== itemId);
        renderClothingItems();
        renderOutfit();
        renderSavedOutfits();
        renderManageOutfits();
        saveToLocalStorage();
    }
}

function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.itemId);
    e.target.classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const itemId = parseInt(e.dataTransfer.getData('text/plain'));
    const item = clothingItems.find(i => i.id === itemId);
    
    if (item && !currentOutfit.find(i => i.id === itemId)) {
        currentOutfit.push(item);
        renderOutfit();
        saveToLocalStorage();
    }
}

function renderOutfit() {
    const canvas = document.getElementById('outfitCanvas');
    canvas.innerHTML = '';
    
    if (currentOutfit.length === 0) {
        canvas.innerHTML = `
            <p style="text-align: center; opacity: 0.7; margin-top: 50px;">
                Glissez-déposez vos vêtements ici pour créer un outfit
            </p>
        `;
        return;
    }
    
    currentOutfit.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'outfit-item';
        itemEl.innerHTML = `
            ${item.photo ? `<img src="${item.photo}" class="clothing-photo">` : `<span style="font-size: 1.5rem;">${item.emoji}</span>`}
            <div style="font-size: 0.8rem; margin-top: 5px;">${item.name}</div>
            <button class="remove-btn" onclick="removeFromOutfit(${item.id})">×</button>
        `;
        canvas.appendChild(itemEl);
    });
}

function removeFromOutfit(itemId) {
    currentOutfit = currentOutfit.filter(item => item.id !== itemId);
    renderOutfit();
    saveToLocalStorage();
}

function clearOutfit() {
    currentOutfit = [];
    renderOutfit();
    saveToLocalStorage();
}

function addClothingItem() {
    const name = document.getElementById('newItemName').value.trim();
    const category = document.getElementById('newItemCategory').value;
    const season = document.getElementById('newItemSeason').value;
    const emoji = document.getElementById('newItemEmoji').value || '👕';
    const photoInput = document.getElementById('newItemPhoto');
    
    if (!name) return;
    
    let photo = "";
    if (photoInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            photo = e.target.result;
            const newItem = {
                id: Date.now(),
                name: name,
                category: category,
                season: season,
                style: [selectedStyle],
                emoji: emoji,
                photo: photo,
                temp: {min: 0, max: 40}
            };
            clothingItems.push(newItem);
            renderClothingItems();
            saveToLocalStorage();
            photoInput.value = '';
            document.getElementById('newItemName').value = '';
            document.getElementById('newItemEmoji').value = '';
        };
        reader.readAsDataURL(photoInput.files[0]);
    } else {
        const newItem = {
            id: Date.now(),
            name: name,
            category: category,
            season: season,
            style: [selectedStyle],
            emoji: emoji,
            photo: "",
            temp: {min: 0, max: 40}
        };
        clothingItems.push(newItem);
        renderClothingItems();
        saveToLocalStorage();
        document.getElementById('newItemName').value = '';
        document.getElementById('newItemEmoji').value = '';
    }
}

function saveOutfit() {
    if (currentOutfit.length === 0) {
        alert('Aucun vêtement dans l\'outfit actuel !');
        return;
    }

    const name = prompt("Entrez un nom pour cet outfit :");
    if (!name) return;

    const season = prompt("Entrez la saison (toute, ete, hiver, mi-saison) :");
    if (!['toute', 'ete', 'hiver', 'mi-saison'].includes(season)) {
        alert('Saison invalide !');
        return;
    }

    const style = prompt(`Entrez le style (${availableStyles.join(', ')}) :`).toLowerCase();
    if (!availableStyles.includes(style)) {
        alert('Style invalide !');
        return;
    }

    const photoInput = document.createElement('input');
    photoInput.type = 'file';
    photoInput.accept = 'image/*';
    photoInput.onchange = function(e) {
        if (e.target.files[0]) {
            compressImage(e.target.files[0], 150, 150, (compressedPhoto) => {
                const newOutfit = {
                    id: Date.now(),
                    name,
                    items: [...currentOutfit],
                    style,
                    season,
                    photo: compressedPhoto, // ✅ version réduite
                    tempRange: calculateOutfitTempRange([...currentOutfit])
                };
                savedOutfits.push(newOutfit);
                renderSavedOutfits();
                renderManageOutfits();
                saveToLocalStorage();
            });
        } else {
            const newOutfit = {
                id: Date.now(),
                name: name,
                items: [...currentOutfit],
                style: style,
                season: season,
                photo: "",
                tempRange: calculateOutfitTempRange([...currentOutfit])
            };
            savedOutfits.push(newOutfit);
            renderSavedOutfits();
            renderManageOutfits();
            saveToLocalStorage();
        }
    };
    photoInput.click();
}

function calculateOutfitTempRange(items) {
    if (!items || items.length === 0) return {min: 0, max: 40};
    const min = Math.max(...items.map(item => item.temp?.min ?? 0));
    const max = Math.min(...items.map(item => item.temp?.max ?? 40));
    return {min, max};
}

function editOutfit(outfitId) {
    const outfit = savedOutfits.find(o => o.id === outfitId);
    if (!outfit) return;

    const name = prompt("Modifier le nom de l'outfit :", outfit.name);
    if (!name) return;

    const season = prompt("Modifier la saison (toute, ete, hiver, mi-saison) :", outfit.season);
    if (!['toute', 'ete', 'hiver', 'mi-saison'].includes(season)) {
        alert('Saison invalide !');
        return;
    }

    const style = prompt(`Modifier le style (${availableStyles.join(', ')}) :`, outfit.style).toLowerCase();
    if (!availableStyles.includes(style)) {
        alert('Style invalide !');
        return;
    }

    // Load outfit items into canvas for editing
    currentOutfit = [...outfit.items];
    renderOutfit();

    // Prompt to save changes after editing items in the canvas
    const confirmSave = confirm("Modifiez les vêtements dans la zone de composition, puis cliquez sur OK pour enregistrer ou Annuler pour annuler.");
    if (!confirmSave) {
        clearOutfit();
        return;
    }

    const photoInput = document.createElement('input');
    photoInput.type = 'file';
    photoInput.accept = 'image/*';
    photoInput.onchange = function(e) {
        const updatedOutfit = {
            id: outfit.id,
            name: name,
            items: [...currentOutfit],
            style: style,
            season: season,
            photo: e.target.files[0] ? "" : outfit.photo,
            tempRange: calculateOutfitTempRange([...currentOutfit])
        };

        if (e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                updatedOutfit.photo = e.target.result;
                savedOutfits = savedOutfits.map(o => o.id === outfitId ? updatedOutfit : o);
                renderSavedOutfits();
                renderManageOutfits();
                saveToLocalStorage();
                alert('Outfit modifié avec succès !');
                clearOutfit(); // Clear canvas after saving
            };
            reader.readAsDataURL(e.target.files[0]);
        } else {
            savedOutfits = savedOutfits.map(o => o.id === outfitId ? updatedOutfit : o);
            renderSavedOutfits();
            renderManageOutfits();
            saveToLocalStorage();
            alert('Outfit modifié avec succès !');
            clearOutfit(); // Clear canvas after saving
        }
    };
    photoInput.click();
}

function deleteOutfit(outfitId) {
    if (confirm('Voulez-vous vraiment supprimer cet outfit ?')) {
        savedOutfits = savedOutfits.filter(o => o.id !== outfitId);
        renderSavedOutfits();
        renderManageOutfits();
        saveToLocalStorage();
    }
}

function renderSavedOutfits() {
    const carousel = document.getElementById('savedOutfits');
    carousel.innerHTML = '<div class="section-title">Outfits Sauvegardés</div>';
    
    savedOutfits.forEach(outfit => {
        const outfitEl = document.createElement('div');
        outfitEl.className = 'saved-outfit';
        outfitEl.innerHTML = `
            ${outfit.photo ? `<img src="${outfit.photo}" class="carousel-photo">` : `<span class="carousel-emoji">${outfit.items.map(i => i.emoji).join('')}</span>`}
            <div class="carousel-info">
                <div class="carousel-name">${outfit.name}</div>
                <div class="carousel-category">${outfit.style} - ${outfit.season}</div>
            </div>
        `;
        outfitEl.addEventListener('click', () => {
            currentOutfit = [...outfit.items];
            renderOutfit();
            displayGeneratedOutfit(outfit.items, outfit.photo, outfit.name, outfit.season);
        });
        carousel.appendChild(outfitEl);
    });
}

function renderManageOutfits() {
    const manageSection = document.getElementById('manageOutfits');
    manageSection.innerHTML = '';
    
    savedOutfits.forEach(outfit => {
        const outfitEl = document.createElement('div');
        outfitEl.className = 'saved-outfit';
        outfitEl.innerHTML = `
            ${outfit.photo ? `<img src="${outfit.photo}" class="carousel-photo">` : `<span class="carousel-emoji">${outfit.items.map(i => i.emoji).join('')}</span>`}
            <div class="carousel-info">
                <div class="carousel-name">${outfit.name}</div>
                <div class="carousel-category">${outfit.style} - ${outfit.season}</div>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button class="btn btn-primary" onclick="editOutfit(${outfit.id})">✏️ Modifier</button>
                    <button class="btn btn-secondary" onclick="deleteOutfit(${outfit.id})">🗑️ Supprimer</button>
                </div>
            </div>
        `;
        manageSection.appendChild(outfitEl);
    });
}

function addNewStyle() {
    const styleName = document.getElementById('newStyle').value.trim().toLowerCase();
    if (!styleName || availableStyles.includes(styleName)) return;
    
    availableStyles.push(styleName);
    renderStyles();
    document.getElementById('newStyle').value = '';
    saveToLocalStorage();
}

function deleteStyle(styleName) {
    if (defaultStyles.includes(styleName)) {
        alert('Les styles par défaut ne peuvent pas être supprimés.');
        return;
    }
    if (confirm(`Voulez-vous vraiment supprimer le style "${styleName}" ? Les vêtements et outfits associés seront réassignés au style "casual".`)) {
        availableStyles = availableStyles.filter(style => style !== styleName);
        // Reassign style to 'casual' for affected items and outfits
        clothingItems = clothingItems.map(item => ({
            ...item,
            style: item.style.map(s => s === styleName ? 'casual' : s)
        }));
        savedOutfits = savedOutfits.map(outfit => ({
            ...outfit,
            style: outfit.style === styleName ? 'casual' : outfit.style,
            tempRange: calculateOutfitTempRange(outfit.items)
        }));
        if (selectedStyle === styleName) {
            selectedStyle = 'casual';
        }
        renderStyles();
        renderClothingItems();
        renderSavedOutfits();
        renderManageOutfits();
        saveToLocalStorage();
    }
}

function renderStyles() {
    const styleSelector = document.getElementById('styleSelector');
    styleSelector.innerHTML = '';
    
    availableStyles.forEach(style => {
        const styleEl = document.createElement('div');
        styleEl.className = `style-option ${style === selectedStyle ? 'active' : ''}`;
        styleEl.dataset.style = style;
        styleEl.innerHTML = `
            <span class="clothing-emoji1">🧥</span>
            <div>${style.charAt(0).toUpperCase() + style.slice(1)}</div>
            ${!defaultStyles.includes(style) ? `<button class="delete-btn" onclick="deleteStyle('${style}')">×</button>` : ''}
        `;
        styleEl.addEventListener('click', function(e) {
            if (e.target.className !== 'delete-btn') {
                document.querySelectorAll('.style-option').forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
                selectedStyle = this.dataset.style;
                saveToLocalStorage();
            }
        });
        styleSelector.appendChild(styleEl);
    });
}

const API_KEY = "1f2dd5d20f454a46339cb87baf2781ab";


function getBackgroundByCondition(condition) {
    condition = condition.toLowerCase();
    if (condition.includes("clear")) return "linear-gradient(135deg, #4facfe, #00f2fe)"; // ciel clair
    if (condition.includes("cloud")) return "linear-gradient(135deg, #757f9a, #d7dde8)"; // gris
    if (condition.includes("rain") || condition.includes("drizzle")) return "linear-gradient(135deg, #667db6, #0082c8, #0082c8, #667db6)"; // pluie
    if (condition.includes("snow")) return "linear-gradient(135deg, #83a4d4, #b6fbff)"; // neige
    if (condition.includes("thunderstorm")) return "linear-gradient(135deg, #232526, #414345)"; // orage
    if (condition.includes("fog") || condition.includes("mist")) return "linear-gradient(135deg, #bdc3c7, #2c3e50)"; // brouillard
    return "linear-gradient(135deg, #4facfe, #00f2fe)"; // par défaut
  }

  function getAdvice(uv, wind, weatherMain) {
    let advice = [];
    if (weatherMain.includes("rain")) advice.push("🌂 Prends un parapluie");
    if (weatherMain.includes("snow")) advice.push("🧤 Prévois des gants");
    if (uv > 6) advice.push("🕶️ Crème solaire & lunettes");
    if (wind > 50) advice.push("⚠️ Vent fort, attention");
    if (weatherMain.includes("thunderstorm")) advice.push("⛈️ Risque d’orage");
    if (advice.length === 0) advice.push("👌 Rien de spécial");
    return advice.join(", ");
  }

  async function getWeather() {
    const city = document.getElementById("location").value || "Paris";
    const weatherContainer = document.getElementById("weatherContainer");
    const weatherInfo = document.getElementById("weatherInfo");
    const weatherExtra = document.getElementById("weatherExtra");
  
    const API_KEY = "1f2dd5d20f454a46339cb87baf2781ab";
    const UV_API_KEY = "openuv-jt04rmd7zb74i-io";
  
    try {
      console.log("🌍 Étape 1 : météo + coordonnées");
  
      // 1️⃣ OpenWeatherMap pour temp/vent/pluie + coords
      const geoUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=fr`;
      const geoRes = await fetch(geoUrl);
      if (!geoRes.ok) throw new Error("Ville non trouvée");
      const geo = await geoRes.json();
  
      const temp = Math.round(geo.main.temp);
      const desc = geo.weather[0].description;
      const icon = getWeatherIcon(geo.weather[0].icon);
      const condition = geo.weather[0].main.toLowerCase();
      const precip = geo.rain?.["1h"] ? `${geo.rain["1h"]} mm pluie`
                    : geo.snow?.["1h"] ? `${geo.snow["1h"]} mm neige`
                    : "aucune";
      const windSpeed = Math.round(geo.wind.speed * 3.6);
  
      const { lat, lon } = geo.coord;
      console.log("Coordonnées récupérées :", lat, lon);
  
      // 2️⃣ OpenUV.io pour indice UV actuel
      console.log("☀️ Étape 2 : appel OpenUV.io");
      const uvRes = await fetch(`https://api.openuv.io/api/v1/uv?lat=${lat}&lng=${lon}`, {
        headers: {
          "x-access-token": UV_API_KEY
        }
      });
  
      if (!uvRes.ok) throw new Error("Erreur OpenUV.io (clé invalide ou limite atteinte)");
      const uvData = await uvRes.json();
      console.log("Réponse OpenUV.io :", uvData);
  
      const uv = Math.round(uvData.result.uv); // ✅ UV réel via OpenUV.io
  
      // ✅ Mise à jour UI
      /**weatherContainer.style.background = getBackgroundByCondition(condition);**/
  
      weatherInfo.innerHTML = `
        <div class="weather-temp">${temp}°C ${icon}</div>
        <div class="weather-desc">${desc}</div>
      `;
  
      weatherExtra.innerHTML = `
        <div class="weather-card">
          <div class="weather-icon">💧</div>
          <div class="weather-label"><strong>Précipitations</strong></div>
          <div class="weather-value">${precip}</div>
        </div>
        <div class="weather-card">
          <div class="weather-icon">💨</div>
          <div class="weather-label"><strong>Vent</strong></div>
          <div class="weather-value">${windSpeed} km/h</div>
        </div>
        <div class="weather-card">
          <div class="weather-icon">☀️</div>
          <div class="weather-label"><strong>UV</strong></div>
          <div class="weather-value">${uv}/10</div>
        </div>
        <div class="weather-card">
          <div class="weather-icon">⚠️</div>
          <div class="weather-label"><strong>Conseil</strong></div>
          <div class="weather-value">${getAdvice(uv, windSpeed, condition)}</div>
        </div>
      `;
  
    } catch (error) {
      console.error("❌ Erreur météo :", error);
      weatherInfo.innerHTML = `<div class="weather-temp">Erreur</div><div class="weather-desc">${error.message}</div>`;
      weatherExtra.innerHTML = `<div class="weather-card">Impossible de charger les infos</div>`;
    }
  }
  


  // Charger la météo de Paris au départ
  window.addEventListener("load", getWeather);

function getWeatherIcon(iconCode) {
    const iconMap = {
        '01d': '☀️', '01n': '🌙',
        '02d': '⛅', '02n': '☁️',
        '03d': '☁️', '03n': '☁️',
        '04d': '☁️', '04n': '☁️',
        '09d': '🌧️', '09n': '🌧️',
        '10d': '🌦️', '10n': '🌧️',
        '11d': '⛈️', '11n': '⛈️',
        '13d': '❄️', '13n': '❄️',
        '50d': '🌫️', '50n': '🌫️'
    };
    return iconMap[iconCode] || '☀️';
}

function generateOutfit() {
    try {
        if (!currentWeather) {
            console.error('[Erreur] Météo non disponible. currentWeather =', currentWeather);
            alert('❌ Erreur : Veuillez d\'abord récupérer la météo.');
            return;
        }

        console.log('[Info] Météo récupérée :', currentWeather);

        document.getElementById('loading').classList.add('active');
        document.getElementById('resultDisplay').classList.remove('active');

        setTimeout(() => {
            try {
                const generatedOutfit = generateSmartOutfit();
                if (generatedOutfit) {
                    console.log('[Succès] Outfit trouvé :', generatedOutfit);
                    displayGeneratedOutfit(
                        generatedOutfit.items,
                        generatedOutfit.photo,
                        generatedOutfit.name,
                        generatedOutfit.season
                    );
                    document.getElementById('loading').classList.remove('active');
                    document.getElementById('resultDisplay').classList.add('active');
                } else {
                    console.warn('[Avertissement] Aucun outfit correspondant trouvé.');
                    document.getElementById('loading').classList.remove('active');
                    console.log('Critères utilisés :', {
                        season: getSeasonFromTemp(currentWeather.temp),
                        style: selectedStyle,
                        savedOutfits: savedOutfits
                    });
                    alert('⚠️ Aucun outfit ne correspond aux critères (style, saison). Veuillez sauvegarder une tenue adaptée.');
                }
            } catch (innerErr) {
                console.error('[Erreur interne] lors de la génération de l\'outfit :', innerErr);
                alert('❌ Une erreur est survenue lors de la génération de l\'outfit.');
                document.getElementById('loading').classList.remove('active');
            }
        }, 1500);
    } catch (err) {
        console.error('[Erreur générale] generateOutfit :', err);
        alert('❌ Erreur inconnue dans generateOutfit(). Consultez la console pour plus d\'infos.');
        document.getElementById('loading').classList.remove('active');
    }
}

function seasonsMatch(outfitSeason, detectedSeason) {
    if (outfitSeason === detectedSeason) return true;

    // Équivalence pour mi-saison
    if (outfitSeason === "mi-saison" && 
        (detectedSeason === "printemps" || detectedSeason === "automne")) {
        return true;
    }
    // Équivalence pour toute
    if (outfitSeason === "toute") {
        return true; // "toute" correspond à toutes les saisons
    }
    return false;
}

function generateSmartOutfit() {
    try {
        const temp = currentWeather.temp;
        const season = getSeasonFromDate();

        if (!savedOutfits || !Array.isArray(savedOutfits)) {
            console.error('[Erreur] savedOutfits non défini ou invalide :', savedOutfits);
            return null;
        }

        console.log('[Info] Critères utilisés pour la génération :', {
            season,
            style: selectedStyle,
            savedOutfits
        });

        let matchingOutfits = savedOutfits.filter(outfit => {
            const isValidOutfit = outfit && Array.isArray(outfit.items) && outfit.items.every(item => 
                item && typeof item === 'object' && 'id' in item && 'emoji' in item && 'name' in item && 'category' in item
            );
            const match = isValidOutfit && outfit.style === selectedStyle && seasonsMatch(outfit.season, season);

            console.log(`[Filtrage] Test de ${outfit.name} → Match: ${match}`, {
                styleMatch: outfit.style === selectedStyle,
                seasonMatch: seasonsMatch(outfit.season, season),
                isValidOutfit,
                outfit
            });

            return match;
        });

        if (matchingOutfits.length === 0) {
            console.warn('[Avertissement] Aucune tenue ne correspond aux critères.');
            return null;
        }

        const selected = matchingOutfits[Math.floor(Math.random() * matchingOutfits.length)];
        console.log('[Succès] Outfit sélectionné aléatoirement :', selected);
        return selected;

    } catch (err) {
        console.error('[Erreur] generateSmartOutfit :', err);
        return null;
    }
}

function displayGeneratedOutfit(outfit, photo = "", name = "Outfit généré", season = "") {
    try {
        const visual = document.getElementById('outfitVisual');
        const description = document.getElementById('outfitDescription');
        const details = document.getElementById('outfitDetails');
        const outfitPhoto = document.getElementById('outfitPhoto');

        if (!Array.isArray(outfit) || !outfit.every(item => 
            item && typeof item === 'object' && 'emoji' in item && 'name' in item && 'category' in item
        )) {
            console.error('[Erreur] Format d\'outfit invalide :', outfit);
            alert('❌ Erreur : la tenue générée est mal formée.');
            return;
        }

        if (photo) {
            outfitPhoto.src = photo;
            outfitPhoto.style.display = 'block';
            document.getElementById('outfitEmojis').style.display = 'none';
        } else {
            outfitPhoto.style.display = 'none';
            const emojiContainer = document.getElementById('outfitEmojis');
            emojiContainer.style.display = 'block';
            emojiContainer.innerHTML = outfit.map(item => item.emoji).join('');
        }

        const styleNames = {
            casual: 'décontracté',
            streetwear: 'streetwear',
            classe: 'élégant',
            sport: 'sportif'
        };

        const weatherDesc = (currentWeather.description || "la météo").toLowerCase();
        const seasonDesc = season || getSeasonFromTemp(currentWeather.temp);

        description.innerHTML = `
            Outfit ${styleNames[selectedStyle] || selectedStyle} parfait pour ${weatherDesc} 
            à ${currentWeather.temp}°C en saison ${seasonDesc}. Cette tenue combine confort et style 
            tout en étant adaptée aux conditions météorologiques actuelles.
        `;

        // Remplir les détails
        details.innerHTML = '<div class="section-title">Détails</div>';
        outfit.forEach(item => {
            const detailEl = document.createElement('div');
            detailEl.className = 'carousel-item';
            detailEl.innerHTML = `
                ${item.photo ? `<img src="${item.photo}" class="carousel-photo">` : `<div class="carousel-emoji">${item.emoji}</div>`}
                <div class="carousel-info">
                    <div class="carousel-name">${item.name}</div>
                    <div class="carousel-category">${item.category.charAt(0).toUpperCase() + item.category.slice(1)}</div>
                </div>
            `;
            details.appendChild(detailEl);
        });

        // Met à jour la tenue actuelle
        currentOutfit = [...outfit];
        renderOutfit();
        saveToLocalStorage();
    } catch (err) {
        console.error('[Erreur] displayGeneratedOutfit :', err);
        
    }
}

function saveToFile() {
    const data = {
        clothingItems: clothingItems,
        currentOutfit: currentOutfit,
        savedOutfits: savedOutfits,
        selectedStyle: selectedStyle,
        availableStyles: availableStyles,
        version: "1.3",
        timestamp: Date.now()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'weatherfit-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    saveToLocalStorage();
}

function loadFromFile() {
    document.getElementById('fileInput').click();
}

function handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.clothingItems) {
                clothingItems = data.clothingItems;
                renderClothingItems();
            }
            
            if (data.currentOutfit) {
                currentOutfit = data.currentOutfit;
                renderOutfit();
            }
            
            if (data.savedOutfits) {
                savedOutfits = data.savedOutfits;
                // Ensure tempRange for loaded outfits
                savedOutfits = savedOutfits.map(outfit => ({
                    ...outfit,
                    tempRange: outfit.tempRange || calculateOutfitTempRange(outfit.items)
                }));
                renderSavedOutfits();
                renderManageOutfits();
            }
            
            if (data.selectedStyle) {
                selectedStyle = data.selectedStyle;
                document.querySelectorAll('.style-option').forEach(opt => opt.classList.remove('active'));
                const styleElement = document.querySelector(`[data-style="${selectedStyle}"]`);
                if (styleElement) {
                    styleElement.classList.add('active');
                }
            }
            
            if (data.availableStyles) {
                availableStyles = data.availableStyles;
                renderStyles();
            }
            
            lastSavedTimestamp = data.timestamp || Date.now();
            saveToLocalStorage();
            alert('Données chargées avec succès !');
        } catch (error) {
            
        }
    };
    reader.readAsText(file);
}

function saveToLocalStorage() {
    const data = {
      clothingItems,
      currentOutfit,
      savedOutfits: savedOutfits.map(outfit => ({
        ...outfit,
        tempRange: outfit.tempRange || calculateOutfitTempRange(outfit.items)
      })),
      selectedStyle,
      availableStyles,
      timestamp: Date.now()
    };
  
    try {
      localStorage.setItem('weatherFitData', JSON.stringify(data));
      lastSavedTimestamp = data.timestamp;
      console.log('[SAVE] Données enregistrées');
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.error('⚠️ LocalStorage plein ! Impossible de sauvegarder les images en base64.');
        alert('⚠️ Trop de données à sauvegarder (photos trop volumineuses). Pense à supprimer ou réduire les photos.');
      } else {
        console.error('Erreur lors de la sauvegarde', e);
      }
    }
  }

  

  function compressImage(file, maxWidth = 150, maxHeight = 150, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.src = e.target.result;
        img.onload = function() {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Redimensionner proportionnellement
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height *= maxWidth / width));
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width *= maxHeight / height));
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Compression en JPEG de qualité réduite
            const compressedData = canvas.toDataURL('image/jpeg', 0.6);
            callback(compressedData);
        };
    };
    reader.readAsDataURL(file);
}



function loadFromLocalStorage() {
    const data = localStorage.getItem('weatherFitData');
    if (data) {
        try {
            const parsed = JSON.parse(data);
            
            if (parsed.clothingItems) {
                clothingItems = parsed.clothingItems;
            }
            
            if (parsed.currentOutfit) {
                currentOutfit = parsed.currentOutfit;
            }
            
            if (parsed.savedOutfits) {
                savedOutfits = parsed.savedOutfits.map(outfit => ({
                    ...outfit,
                    tempRange: outfit.tempRange || calculateOutfitTempRange(outfit.items)
                }));
            }
            
            if (parsed.selectedStyle) {
                selectedStyle = parsed.selectedStyle;
            }
            
            if (parsed.availableStyles) {
                availableStyles = parsed.availableStyles;
            }
            
            lastSavedTimestamp = parsed.timestamp || Date.now();
            
            renderClothingItems();
            renderOutfit();
            renderSavedOutfits();
            renderManageOutfits();
            renderStyles();
        } catch (error) {
            console.error('Erreur lors du chargement depuis localStorage:', error);
        }
    }
}

function loadFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedData = urlParams.get('data');
    
    // ✅ Si pas de data dans l'URL, on sort direct → ça n'écrase rien !
    if (!encodedData) {
        console.log('[LOAD URL] Aucun paramètre ?data= → on ne modifie rien');
        return;
    }

    try {
        const data = JSON.parse(safeAtob(encodedData));
        const urlTimestamp = data.timestamp || 0;
        
        // ✅ On ne charge QUE si l’URL est plus récente
        if (!localStorage.getItem('weatherFitData') || urlTimestamp > lastSavedTimestamp) {
            console.log('[LOAD URL] Chargement depuis URL car plus récent');

            clothingItems = data.items || [];
            currentOutfit = data.outfit || [];
            savedOutfits = (data.savedOutfits || []).map(outfit => ({
                ...outfit,
                tempRange: outfit.tempRange || calculateOutfitTempRange(outfit.items)
            }));
            selectedStyle = data.style || selectedStyle;
            availableStyles = data.availableStyles || availableStyles;

            lastSavedTimestamp = urlTimestamp;

            saveToLocalStorage();
            renderClothingItems();
            renderOutfit();
            renderSavedOutfits();
            renderManageOutfits();
            renderStyles();
        } else {
            console.log('[LOAD URL] Données locales plus récentes → on garde localStorage');
        }
    } catch (error) {
        console.error('Erreur lors du chargement depuis l\'URL:', error);
    }
}


function shareURL() {
    const data = {
        items: clothingItems,
        outfit: currentOutfit,
        savedOutfits: savedOutfits,
        style: selectedStyle,
        availableStyles: availableStyles,
        timestamp: Date.now()
    };
    
    const encoded = safeBtoa(JSON.stringify(data));


    const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
            alert('URL copiée dans le presse-papiers !');
        });
    } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('URL copiée dans le presse-papiers !');
    }
}

function safeBtoa(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  function safeAtob(str) {
    return decodeURIComponent(escape(atob(str)));
  }
  


function getTemperatureCategory(temp) {
    if (temp < 5) return 'très froid';
    if (temp < 15) return 'froid';
    if (temp < 25) return 'doux';
    return 'chaud';
}

function getSeasonFromTemp(temp) {
    if (temp < 10) return 'hiver';
    if (temp >= 10 && temp <= 25) return 'printemps'; // Équivalence avec mi-saison
    if (temp > 25) return 'ete';
    return 'automne'; // Équivalence avec mi-saison
}

function getSeasonFromDate(date = new Date()) {
    const day = date.getDate();
    const month = date.getMonth() + 1; // Janvier = 1, Décembre = 12

    // Créer une date numérique sous forme MMDD pour simplifier
    const mmdd = month * 100 + day;

    if (mmdd >= 321 && mmdd < 621) { 
        return 'printemps';   // 21 mars - 20 juin
    } else if (mmdd >= 621 && mmdd < 921) { 
        return 'ete';         // 21 juin - 20 septembre
    } else if (mmdd >= 921 && mmdd < 1221) { 
        return 'automne';     // 21 septembre - 20 décembre
    } else { 
        return 'hiver';       // 21 décembre - 20 mars
    }
}


// Gestion des erreurs globales
window.addEventListener('error', function(e) {
    console.error('Erreur JavaScript:', e.error);
});

// Gestion du redimensionnement
window.addEventListener('resize', function() {
    // Réajustement responsive si nécessaire
});

// Sauvegarde automatique périodique dans l'URL
setInterval(function() {
    if (clothingItems.length > 10 || currentOutfit.length > 0 || savedOutfits.length > 0) {
        const data = {
            items: clothingItems.slice(-20),
            outfit: currentOutfit,
            savedOutfits: savedOutfits,
            style: selectedStyle,
            availableStyles: availableStyles,
            timestamp: Date.now()
        };
        
        const encoded = btoa(JSON.stringify(data));
        const newUrl = `${window.location.origin}${window.location.pathname}?data=${encoded}`;
        window.history.replaceState({}, '', newUrl);
    }
}, 30000);

// Initialisation des raccourcis clavier
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveToFile();
    }
    
    if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        loadFromFile();
    }
    
    if (e.key === ' ' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        generateOutfit();
    }
    
    if (e.key === 'Escape') {
        clearOutfit();
    }
});

// Gestion des événements tactiles pour mobile
document.addEventListener('touchstart', function(e) {
    // Amélioration de l'expérience tactile
});

// Fonction de debug pour le développement
function debugInfo() {
    console.log('=== WeatherFit Debug Info ===');
    console.log('Vêtements:', clothingItems.length, clothingItems);
    console.log('Outfit actuel:', currentOutfit.length, currentOutfit);
    console.log('Outfits sauvegardés:', savedOutfits.length, savedOutfits);
    console.log('Style sélectionné:', selectedStyle);
    console.log('Styles disponibles:', availableStyles);
    console.log('Météo actuelle:', currentWeather);
    console.log('Dernier timestamp:', lastSavedTimestamp);
    console.log('URL actuelle:', window.location.href);
}

window.debugWeatherFit = debugInfo;