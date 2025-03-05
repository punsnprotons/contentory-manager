
import Header from './Header';
import AuthButton from './AuthButton';

// This wrapper component allows us to add the AuthButton to the Header
// without modifying the original Header component directly
const HeaderWrapper = () => {
  return <Header rightContent={<AuthButton />} />;
};

export default HeaderWrapper;
