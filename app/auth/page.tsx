"use client";

import { RiArrowRightSLine } from "@remixicon/react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const Auth = () => {
  const [currentStep, setCurrentStep] = useState(0);

  // ==============================================
  // ONBOARDING STEPS DATA - Edit content here
  // ==============================================
  const onboardingSteps = [
    {
      // STEP 1
      image: "/girl-with-phone.png",
      imageAlt: "Girl with phone",
      title: (
        <>
          Learn <span>complex</span> stuff with fun lessons
        </>
      ),
      description:
        "Master new skills with bite-sized lessons that make learning simple and fun.",
      buttonColor: "from-sky-300 to-sky-400", // Step 1 button color
      // Layer colors for Step 1
      layerColors: {
        bottom: "bg-sky-800",
        middle: "bg-sky-600",
        top: "bg-linear-to-br from-sky-300 to-sky-400",
      },
    },
    {
      // STEP 2
      image: "/free-of-charges.png", // Edit image path
      imageAlt: "Step 2 image",
      title: (
        <>
          No price tag on Ramblee
        </>
      ),
      description:
        "Learn for free. No need to pay for anything.",
      buttonColor: "from-purple-400 to-purple-600", // Step 2 button color
      // Layer colors for Step 2
      layerColors: {
        bottom: "bg-purple-800",
        middle: "bg-purple-600",
        top: "bg-linear-to-br from-purple-300 to-purple-400",
      },
    },
    {
      // STEP 3
      image: "/community.png", // Edit image path
      imageAlt: "Step 3 image",
      title: (
        <>
          Join a <span>community</span> of learners
        </>
      ),
      description:
        "Connect with others, share your journey, and learn together.",
      buttonColor: "from-pink-400 to-pink-600", // Step 3 button color
      // Layer colors for Step 3
      layerColors: {
        bottom: "bg-pink-800",
        middle: "bg-pink-600",
        top: "bg-linear-to-br from-pink-300 to-pink-400",
      },
    },
  ];

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Navigate to login - implement your navigation logic here
      console.log("Navigate to login");
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    // Navigate to login - implement your navigation logic here
    console.log("Skip to login");
  };

  const currentData = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;

  return (
    <div>
      <div className="relative w-screen h-screen">
        <div className="w-screen h-screen flex flex-col">
          <div className="w-full relative h-[60%]">
            {/* Skip button */}
            <button
              onClick={handleSkip}
              className="bg-gray-700/55 absolute z-30 px-4 py-2 top-4 right-4 text-white font-semibold rounded-full"
            >
              Skip
            </button>

            {/* Animated layered stack */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`layer-${currentStep}`}
                className="absolute inset-0"
              >
                {/* Layer 1 - Bottom */}
                <motion.div
                  initial={{ y: -30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 30, opacity: 0 }}
                  transition={{ duration: 0.4, delay: 0 }}
                  className={`absolute z-0 w-full h-full ${currentData.layerColors.bottom} overflow-hidden rounded-b-4xl`}
                />

                {/* Layer 2 - Middle */}
                <motion.div
                  initial={{ y: -30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 30, opacity: 0 }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                  className={`absolute z-10 w-full h-[calc(100%-10px)] ${currentData.layerColors.middle} overflow-hidden rounded-b-4xl`}
                />

                {/* Layer 3 - Top with Image */}
                <motion.div
                  initial={{ y: -30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 30, opacity: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className={`absolute z-20 w-full h-[calc(100%-20px)] ${currentData.layerColors.top} overflow-hidden rounded-b-4xl`}
                >
                  {/* Image with scale animation */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.1, opacity: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="relative w-full h-full"
                  >
                    <Image
                      src={currentData.image}
                      alt={currentData.imageAlt}
                      fill
                      className="object-cover"
                    />
                  </motion.div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Content area with fade animation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`content-${currentStep}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="p-6"
            >
              <h2 className="text-3xl font-extrabold">{currentData.title}</h2>
              <p className="text-gray-700 mt-2">{currentData.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom navigation */}
        <div className="absolute bottom-0 left-0 w-full px-6 py-5 border-t border-gray-200 flex items-center justify-between">
          {/* Progress indicators */}
          <div className="flex gap-2">
            {onboardingSteps.map((_, index) => (
              <motion.div
                key={index}
                animate={{
                  backgroundColor:
                    index === currentStep ? "#374151" : "#D1D5DB",
                }}
                transition={{ duration: 0.3 }}
                className="w-3 h-3 rounded-full"
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-3">
            {/* Back button - only show if not on first step */}
            {currentStep > 0 && (
              <motion.button
                onClick={handleBack}
                whileTap={{ scale: 0.95 }}
                className="bg-gray-200 text-gray-700 font-extrabold px-6 py-2 rounded-full flex items-center gap-1"
              >
                Back
              </motion.button>
            )}

            {/* Next/Continue button */}
            <motion.button
              onClick={handleNext}
              whileTap={{ scale: 0.95 }}
              className={`bg-linear-to-br ${currentData.buttonColor} text-white font-extrabold px-6 py-2 rounded-full flex items-center gap-1`}
            >
              {isLastStep ? (
                "Continue"
              ) : (
                <RiArrowRightSLine size={20} />
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
