// src/components/common/Card.jsx
const Card = ({ children, className = '', as: Tag = 'div', ...rest }) => (
  <Tag className={`card-glass p-5 sm:p-6 ${className}`} {...rest}>
    {children}
  </Tag>
);

export default Card;
