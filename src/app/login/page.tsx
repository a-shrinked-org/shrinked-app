import React, { useState } from 'react';
import { useLogin, useRegister } from "@refinedev/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

export default function Login() {
  const { mutate: login } = useLogin();
  const { mutate: register } = useRegister();
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: ""
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCustomLogin = async (e) => {
    e.preventDefault();
    setError("");
    
    login({
      email: formData.email,
      password: formData.password
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    
    register(formData);
  };

  const handleAuth0Login = () => {
    login({
      providerName: "auth0"
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            Welcome
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <div className="space-y-4 mt-4">
                <Button 
                  onClick={handleAuth0Login}
                  className="w-full flex items-center justify-center gap-2"
                  variant="outline"
                >
                  <img
                    className="h-5 w-5"
                    alt="Auth0"
                    src="https://refine.ams3.cdn.digitaloceanspaces.com/superplate-auth-icons%2Fauth0-2.svg"
                  />
                  Sign in with Auth0
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>

                <form onSubmit={handleCustomLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Sign in
                  </Button>
                </form>
              </div>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    name="email"
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-username">Username</Label>
                  <Input
                    id="register-username"
                    name="username"
                    type="text"
                    placeholder="Username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    name="password"
                    type="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Register
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}