document.addEventListener('DOMContentLoaded', () => {
    const bgOptions = document.querySelectorAll('.bg-option');
    const video = document.getElementById('background-video');
    const backgroundLayer = document.querySelector('.background-layer');

    bgOptions.forEach(option => {
    option.addEventListener('click', () => {
        bgOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');

        const type = option.dataset.type;
        const src = option.dataset.src;

        if (type === 'video') {
        backgroundLayer.style.backgroundImage = '';
        video.src = src;
        video.style.display = 'block';
        } else {
        video.style.display = 'none';
        backgroundLayer.style.backgroundImage = `url(${src})`;
        }
    });
    });
});