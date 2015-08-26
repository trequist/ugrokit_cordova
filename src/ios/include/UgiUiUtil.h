//
//  UgiUiUtil.h
//  UGrokItApi
//
//  Copyright (c) 2012 U Grok It. All rights reserved.
//

#import <UIKit/UIKit.h>

/**
 UgiUiUtil is a collection of static UI utilities for showing alerts. It is used by
 UgiDefaultConfigurationUi to show UI for configuration
 */
@interface UgiUiUtil : NSObject

/**
 Completion type for showAlertView:withCompletion:
 */
typedef void (^UgiUiUtilAlertViewCompletion)(NSInteger buttonIndex);

/**
 Show an alert with a completion for when a button is pressed
 
 @param alertView    UIAlertView to show
 @param completion   Completion to call when a button is pressed
 */
+ (void)showAlertView:(UIAlertView *)alertView
       withCompletion:(UgiUiUtilAlertViewCompletion)completion;

/**
 Show Ok/Cancel alert with completion for Ok and custom "ok" text and "cancel" text
 
 @param title               Title for the alert
 @param message             Text for the body of the alert
 @param okButtonTitle       Text for the "ok" button, or "" for the defualt, or nil for no ok button
 @param cancelButtonTitle   Text for the "cancel" button, or "" for the defualt, or nil for no cancel button
 @param completion          Block to execute for "ok"
 @param cancelCompletion    Block to execute for "cancel"
 @return                    The UIAlertView created and shown
 */
+ (UIAlertView *)showOkCancel:(NSString *)title
                      message:(NSString *)message
                okButtonTitle:(NSString *)okButtonTitle
            cancelButtonTitle:(NSString *)cancelButtonTitle
               withCompletion:(void(^)(void))completion
         withCancelCompletion:(void(^)(void))cancelCompletion;

/**
 Show Ok alert
 
 @param title               Title for the alert
 @param message             Text for the body of the alert
 @param okButtonTitle       Text for the "ok" button, or "" for the defualt, or nil for no ok button
 @param completion          Block to execute for "ok"
 @return                    The UIAlertView created and shown
 */
+ (UIAlertView *)showOk:(NSString *)title
                message:(NSString *)message
          okButtonTitle:(NSString *)okButtonTitle
         withCompletion:(void(^)(void))completion;

/**
 Dismiss an alert without calling its completion

 @param alert             UIAlertView to dismiss
 */
+ (void) dismissAlertWithoutCallingCompletion:(UIView *)alert;

/**
 Update the message in an alert
 
 @param alert             UIAlertView to update
 @param message           Text for the body of the alert
 */
+ (void) updateAlert:(UIView *)alert
         withMessage:(NSString *)message;

/**
 Show "waiting" alert, call completion if cancelled
 
 @param message               Text for the body of the alert
 @param cancelCompletion      Block to execute for "cancel" (or nil if cancel is not an option)
 */
+ (void) showWaiting:(NSString *)message
withCancelCompletion:(void(^)(void))cancelCompletion;

/**
 Show "waiting" alert without cancel
 
 @param message               Text for the body of the alert
 */
+ (void) showWaiting:(NSString *)message;

/**
 Hide "waiting" alert
 */
+ (void) hideWaiting;

/**
 Show a view controller

 @param viewController       View controller to show
 */
+ (void) showViewController:(UIViewController *)viewController;

/**
 Hide a view controller

 @param viewController       View controller to hide
 */
+ (void) hideViewController:(UIViewController *)viewController;

@end
