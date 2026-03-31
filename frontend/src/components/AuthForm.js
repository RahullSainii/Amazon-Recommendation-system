import React from 'react';
import './AuthForm.css';

const AuthForm = ({ title, children, footerText, footerLink, footerLinkText }) => {
    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-head">
                    <div className="auth-logo-wrap">
                        <img
                            src="/amazon-editorial-logo.webp"
                            alt="Amazon Recommendations"
                            className="auth-logo"
                        />
                        <span>AmazonRecs</span>
                    </div>
                    <h2>{title}</h2>
                </div>
                {children}
                <div className="auth-footer">
                    {footerText} <a href={footerLink}>{footerLinkText}</a>
                </div>
            </div>
        </div>
    );
};

export default AuthForm;
