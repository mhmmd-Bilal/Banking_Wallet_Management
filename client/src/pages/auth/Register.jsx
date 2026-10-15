import { useRef } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CustomerForm from '../../components/CustomerForm';
import { homeFor } from '../../components/ProtectedRoute';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const registering = useRef(false); // stops the "already signed in" redirect racing our own navigation

  if (user && !registering.current) return <Navigate to={homeFor(user)} replace />;

  const onSubmit = async (formData) => {
    registering.current = true;
    try {
      await register(formData);
    } catch (e) {
      registering.current = false;
      throw e;
    }
    navigate('/open-account', { replace: true }); // next step: choose an account type
  };

  return (
    <div className="card p-8 sm:p-10">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="mb-7 mt-1 text-sm text-slate-500">Register, then open your bank account. An admin reviews your identity document before financial features unlock.</p>
      <CustomerForm mode="register" onSubmit={onSubmit} submitLabel="Create account" />
      <p className="mt-6 text-center text-sm text-slate-500">Already registered? <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">Sign in</Link></p>
    </div>
  );
}
