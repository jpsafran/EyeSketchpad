// Wait for DOM to be loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    document.getElementById('current-year').textContent = new Date().getFullYear();

    // Mobile menu toggle
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const nav = document.querySelector('nav');
    
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', function() {
            nav.classList.toggle('active');
        });
    }

    // FAQ Toggles
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const targetId = this.getAttribute('data-toggle');
            const answer = document.getElementById(targetId);
            
            // Toggle active class
            this.classList.toggle('active');
            answer.classList.toggle('active');
            
            // Update the toggle icon
            const toggleIcon = this.querySelector('.toggle-icon');
            if (this.classList.contains('active')) {
                toggleIcon.textContent = '−';
            } else {
                toggleIcon.textContent = '+';
            }
        });
    });

    // Testimonial slider
    const testimonials = document.querySelectorAll('.testimonial');
    const dots = document.querySelectorAll('.dot');
    const prevButton = document.querySelector('.prev-testimonial');
    const nextButton = document.querySelector('.next-testimonial');
    let currentSlide = 0;

    function showSlide(index) {
        // Hide all testimonials
        testimonials.forEach(testimonial => {
            testimonial.classList.remove('active');
        });
        
        // Remove active class from all dots
        dots.forEach(dot => {
            dot.classList.remove('active');
        });
        
        // Show current testimonial and activate current dot
        testimonials[index].classList.add('active');
        dots[index].classList.add('active');
        
        currentSlide = index;
    }

    // Next button click
    if (nextButton) {
        nextButton.addEventListener('click', function() {
            currentSlide = (currentSlide + 1) % testimonials.length;
            showSlide(currentSlide);
        });
    }

    // Previous button click
    if (prevButton) {
        prevButton.addEventListener('click', function() {
            currentSlide = (currentSlide - 1 + testimonials.length) % testimonials.length;
            showSlide(currentSlide);
        });
    }

    // Dot clicks
    dots.forEach((dot, index) => {
        dot.addEventListener('click', function() {
            showSlide(index);
        });
    });

    // Auto advance slides every 5 seconds
    setInterval(function() {
        currentSlide = (currentSlide + 1) % testimonials.length;
        showSlide(currentSlide);
    }, 5000);

    // Video modal
    const videoPlaceholder = document.getElementById('video-placeholder');
    
    if (videoPlaceholder) {
        videoPlaceholder.addEventListener('click', function() {
            // Replace this with your actual video embed code
            const videoEmbed = `
                <iframe width="100%" height="450" 
                src="https://www.youtube.com/embed/YOUR_VIDEO_ID?autoplay=1" 
                title="Eye Exam Sketchpad Demo" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen></iframe>
            `;
            
            this.parentNode.innerHTML = videoEmbed;
        });
    }

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
            
            // Close mobile menu if open
            if (nav.classList.contains('active')) {
                nav.classList.remove('active');
            }
        });
    });

    // Animation on scroll
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.feature-card, .step, .privacy-card').forEach(element => {
        observer.observe(element);
    });
});